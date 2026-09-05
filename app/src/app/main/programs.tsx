import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Linking, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  CATALOG_PAGE_SIZE,
  getCatalogFilters,
  getNsqfQualifications,
  getPmajayCourses,
  getPrograms,
  type NsqfQualification,
  type PmajayCourse,
  type Program,
} from '@/lib/api';
import { UI_STRINGS } from '@/constants/languages';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { Button, Card, Chip, Screen, Txt } from '@/ui';

type Tab = 'programs' | 'pmajay-courses' | 'nsqf';

type Row =
  | { kind: 'programs'; item: Program }
  | { kind: 'pmajay-courses'; item: PmajayCourse }
  | { kind: 'nsqf'; item: NsqfQualification };

const TABS: { key: Tab; label: string }[] = [
  { key: 'programs', label: '' },
  { key: 'pmajay-courses', label: 'PM-AJAY' },
  { key: 'nsqf', label: 'NSQF' },
];

export default function CatalogScreen() {
  const { language } = useStore();
  const { c, radius } = useTheme();

  const [tab, setTab] = useState<Tab>('programs');
  const [page, setPage] = useState(1);
  const [sector, setSector] = useState<string | undefined>();
  const [subFilter, setSubFilter] = useState<string | undefined>();
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [sectors, setSectors] = useState<string[]>([]);
  const [subFilters, setSubFilters] = useState<string[]>([]);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [error, setError] = useState(false);

  useEffect(() => {
    const id = setTimeout(() => {
      setSearch(query.trim());
      setPage(1);
    }, 350);
    return () => clearTimeout(id);
  }, [query]);

  useEffect(() => {
    setPage(1);
    setSector(undefined);
    setSubFilter(undefined);
    setQuery('');
    setSearch('');
    let cancelled = false;
    getCatalogFilters(tab)
      .then((f) => {
        if (cancelled) return;
        setSectors(f.sectors);
        setSubFilters((f.courseLevels ?? f.levels?.map(String) ?? []) as string[]);
      })
      .catch(() => {
        if (cancelled) return;
        setSectors([]);
        setSubFilters([]);
      });
    return () => {
      cancelled = true;
    };
  }, [tab]);

  const load = useCallback(() => {
    setError(false);
    setRows(null);
    const common = { page, sector, q: search || undefined };
    const request =
      tab === 'programs'
        ? getPrograms(common).then((r) => ({ ...r, rows: r.items.map((item) => ({ kind: 'programs' as const, item })) }))
        : tab === 'pmajay-courses'
          ? getPmajayCourses({ ...common, courseLevel: subFilter }).then((r) => ({
              ...r,
              rows: r.items.map((item) => ({ kind: 'pmajay-courses' as const, item })),
            }))
          : getNsqfQualifications({ ...common, level: subFilter ? Number(subFilter) : undefined }).then((r) => ({
              ...r,
              rows: r.items.map((item) => ({ kind: 'nsqf' as const, item })),
            }));

    request
      .then((r) => {
        setRows(r.rows);
        setTotal(r.total);
        setTotalPages(r.totalPages);
      })
      .catch(() => setError(true));
  }, [tab, page, sector, subFilter, search]);

  useEffect(load, [load]);

  if (!language) return null;
  const t = UI_STRINGS[language];
  const tabLabel = (key: Tab) => (key === 'programs' ? t.tabTraining : TABS.find((x) => x.key === key)!.label);

  function selectFilter(setter: (v: string | undefined) => void) {
    return (value: string | undefined) => {
      setter(value);
      setPage(1);
    };
  }

  return (
    <Screen edges={['top']}>
      <View style={styles.header}>
        <Txt variant="title">{t.programsTitle}</Txt>
        <Txt variant="body" tone="dim">
          {t.programsSubtitle}
        </Txt>
      </View>

      <View style={[styles.tabs, { backgroundColor: c.surfaceAlt, borderRadius: radius.md }]}>
        {TABS.map((x) => (
          <Pressable
            key={x.key}
            onPress={() => setTab(x.key)}
            style={[styles.tabBtn, { borderRadius: radius.sm }, tab === x.key && { backgroundColor: c.surface }]}>
            <Txt variant="label" tone={tab === x.key ? 'primary' : 'dim'}>
              {tabLabel(x.key)}
            </Txt>
          </Pressable>
        ))}
      </View>

      <View style={[styles.searchBox, { backgroundColor: c.surface, borderColor: c.border, borderRadius: radius.md }]}>
        <Ionicons name="search" size={17} color={c.textFaint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder={t.searchPlaceholder}
          placeholderTextColor={c.textFaint}
          style={[styles.searchInput, { color: c.text }]}
        />
        {query.length > 0 && (
          <Ionicons name="close-circle" size={17} color={c.textFaint} onPress={() => setQuery('')} suppressHighlighting />
        )}
      </View>

      <FilterChips values={sectors} selected={sector} allLabel={t.filterAll} onSelect={selectFilter(setSector)} />
      {subFilters.length > 0 && (
        <FilterChips
          values={subFilters}
          selected={subFilter}
          allLabel={t.filterAll}
          onSelect={selectFilter(setSubFilter)}
        />
      )}

      {error && (
        <View style={styles.center}>
          <Txt variant="body" tone="danger" center>
            {t.noConnection}
          </Txt>
          <Button label={t.tryAgain} variant="secondary" size="md" onPress={load} style={{ marginTop: 12 }} />
        </View>
      )}

      {!error && rows === null && (
        <View style={styles.center}>
          <ActivityIndicator color={c.primary} />
          <Txt variant="body" tone="dim" style={{ marginTop: 8 }}>
            {t.loadingPrograms}
          </Txt>
        </View>
      )}

      {!error && rows && (
        <FlatList
          data={rows}
          keyExtractor={(r) => r.item.id}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <Txt variant="caption" tone="faint">
              {t.resultsCount.replace('{n}', String(total))}
            </Txt>
          }
          ListEmptyComponent={
            <Txt variant="body" tone="dim" center style={{ paddingVertical: 24 }}>
              {t.noResults}
            </Txt>
          }
          renderItem={({ item: row, index }) => <CatalogCard row={row} index={index} />}
          ListFooterComponent={
            total > CATALOG_PAGE_SIZE ? (
              <View style={styles.pager}>
                <Button
                  label={t.back}
                  variant="secondary"
                  size="md"
                  icon="chevron-back"
                  fullWidth={false}
                  disabled={page <= 1}
                  onPress={() => setPage((p) => Math.max(1, p - 1))}
                />
                <Txt variant="caption" tone="dim">
                  {t.pageOf.replace('{n}', String(page)).replace('{total}', String(totalPages))}
                </Txt>
                <Button
                  label={t.next}
                  variant="secondary"
                  size="md"
                  icon="chevron-forward"
                  fullWidth={false}
                  disabled={page >= totalPages}
                  onPress={() => setPage((p) => Math.min(totalPages, p + 1))}
                />
              </View>
            ) : null
          }
        />
      )}
    </Screen>
  );
}

function FilterChips({
  values,
  selected,
  allLabel,
  onSelect,
}: {
  values: string[];
  selected: string | undefined;
  allLabel: string;
  onSelect: (v: string | undefined) => void;
}) {
  const { c, radius } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
      {[undefined, ...values].map((value) => {
        const active = selected === value;
        return (
          <Pressable
            key={value ?? '__all'}
            onPress={() => onSelect(value)}
            style={[
              styles.filterChip,
              {
                borderRadius: radius.pill,
                backgroundColor: active ? c.primary : c.surfaceAlt,
                borderColor: active ? c.primary : c.border,
              },
            ]}>
            <Txt variant="caption" style={{ color: active ? c.onPrimary : c.textDim }}>
              {value ?? allLabel}
            </Txt>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function CatalogCard({ row, index }: { row: Row; index: number }) {
  const { language } = useStore();
  const { c } = useTheme();
  const t = UI_STRINGS[language ?? 'hi'];

  if (row.kind === 'nsqf') {
    const q = row.item;
    const eduLabel: Record<string, string> = {
      none: t.eduBelow10th,
      below_10th: t.eduBelow10th,
      '10th': t.edu10th,
      '12th': t.edu12th,
      iti_diploma: t.eduIti,
      undergrad: t.eduUndergrad,
      postgrad: t.eduPostgrad,
    };
    return (
      <Card index={index} style={{ gap: 8 }}>
        <Txt variant="overline" tone="faint">
          {q.qpCode}
        </Txt>
        <Txt variant="h2">{language === 'hi' ? q.titleHindi ?? q.title : q.title}</Txt>
        <View style={styles.chipRow}>
          <Chip label={q.sector} />
          <Chip label={`NSQF ${q.nsqfLevel}`} icon="layers" tone="primary" />
          {q.notionalHours != null && <Chip label={`${q.notionalHours} h`} icon="time" />}
          {q.minEducation && <Chip label={eduLabel[q.minEducation] ?? q.minEducation} icon="school" tone="success" />}
        </View>
        {q.proposedOccupations?.length > 0 && (
          <Txt variant="caption" tone="dim">
            {q.proposedOccupations.slice(0, 3).join(' · ')}
          </Txt>
        )}
        {q.ssc && (
          <Txt variant="caption" tone="faint">
            {q.ssc}
          </Txt>
        )}
      </Card>
    );
  }

  if (row.kind === 'pmajay-courses') {
    const course = row.item;
    return (
      <Card index={index} style={{ gap: 8 }}>
        <Txt variant="overline" tone="faint">
          {course.subCourseCode}
        </Txt>
        <Txt variant="h2">{course.subCourseName}</Txt>
        <View style={styles.chipRow}>
          <Chip label={course.sector} />
          <Chip label={course.courseLevel} icon="ribbon" tone="primary" />
        </View>
        <Txt variant="caption" tone="faint">
          {course.courseName}
        </Txt>
      </Card>
    );
  }

  const p = row.item;
  return (
    <Card index={index} style={{ gap: 10 }}>
      <View style={styles.badgeRow}>
        <View style={[styles.schemeBadge, { backgroundColor: c.primary }]}>
          <Txt variant="caption" style={{ color: '#fff' }}>
            {p.scheme}
            {p.component ? ` · ${p.component}` : ''}
          </Txt>
        </View>
        {p.stipend && <Chip label={t.stipendYes} icon="cash" tone="accent" />}
      </View>
      <Txt variant="h2">{language === 'hi' ? p.nameHindi ?? p.name : p.name}</Txt>
      <View style={styles.chipRow}>
        {p.sector && <Chip label={p.sector} />}
        {p.nsqfLevel != null && <Chip label={`NSQF ${p.nsqfLevel}`} icon="layers" />}
        {p.durationWeeks != null && <Chip label={`${p.durationWeeks} ${t.weeks}`} icon="time" />}
        {typeof p.seatsAvailable === 'number' && (
          <Chip label={`${p.seatsAvailable} ${t.seats}`} icon="people" tone="success" />
        )}
      </View>
      {(p.district || p.state) && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          <Ionicons name="location" size={12} color={c.textFaint} />
          <Txt variant="caption" tone="faint">
            {[p.district, p.state].filter(Boolean).join(', ')}
          </Txt>
        </View>
      )}
      {p.contactPhone && (
        <Button
          label={`${t.call} · ${p.contactPhone}`}
          variant="success"
          size="md"
          icon="call"
          onPress={() => Linking.openURL(`tel:${p.contactPhone}`).catch(() => {})}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 8, gap: 2 },
  tabs: { flexDirection: 'row', marginHorizontal: 20, padding: 4, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 8, alignItems: 'center' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 10,
    paddingHorizontal: 12,
    height: 44,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  filterRow: { gap: 7, paddingHorizontal: 20, paddingTop: 10 },
  filterChip: { paddingHorizontal: 12, paddingVertical: 7, borderWidth: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  list: { padding: 20, paddingTop: 12, gap: 12 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  schemeBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 16 },
});
