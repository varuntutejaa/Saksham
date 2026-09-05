import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import {
  CATALOG_PAGE_SIZE,
  getCatalogFilters,
  getNsqfQualifications,
  getPmajayCourses,
  type NsqfQualification,
  type PmajayCourse,
} from '@/lib/api';
import { UI_STRINGS } from '@/constants/languages';
import { useStore } from '@/lib/store';
import { useTheme } from '@/theme';
import { Button, Card, Chip, Screen, Txt } from '@/ui';

// Only the two real, scraped catalogues. The old "programs" tab was backed by
// TrainingProgram — 12 hand-written demo rows with placeholder phone numbers.
type Tab = 'pmajay-courses' | 'nsqf';

type Row =
  | { kind: 'pmajay-courses'; item: PmajayCourse }
  | { kind: 'nsqf'; item: NsqfQualification };

const TABS: { key: Tab; label: string }[] = [
  { key: 'pmajay-courses', label: '' },
  { key: 'nsqf', label: 'NSQF' },
];

export default function CatalogScreen() {
  const { language, state } = useStore();
  const { c, radius, elevation } = useTheme();

  const [tab, setTab] = useState<Tab>('pmajay-courses');
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
  const [applyFor, setApplyFor] = useState<PmajayCourse | null>(null);

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
      tab === 'pmajay-courses'
        ? getPmajayCourses({ ...common, courseLevel: subFilter, preferredState: state }).then((r) => ({
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
  }, [tab, page, sector, subFilter, search, state]);

  useEffect(load, [load]);

  if (!language) return null;
  const t = UI_STRINGS[language];
  const tabLabel = (key: Tab) => (key === 'pmajay-courses' ? t.tabTraining : TABS.find((x) => x.key === key)!.label);

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

      <View style={[styles.tabs, { backgroundColor: c.surfaceAlt, borderRadius: radius.lg }]}>
        {TABS.map((x) => (
          <Pressable
            key={x.key}
            onPress={() => setTab(x.key)}
            style={[
              styles.tabBtn,
              { borderRadius: radius.md },
              tab === x.key && [{ backgroundColor: c.surface }, elevation('card')],
            ]}>
            <Txt variant="label" tone={tab === x.key ? 'primary' : 'dim'} style={tab === x.key ? { fontWeight: '600' } : undefined}>
              {tabLabel(x.key)}
            </Txt>
          </Pressable>
        ))}
      </View>

      <View style={[styles.searchBox, { backgroundColor: c.surface, borderColor: c.border, borderRadius: radius.lg }]}>
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

      {/* Fixed header/tabs/search/filters stay put; only this region scrolls —
          without an explicit flex:1 + FlatList style, the whole page scrolled
          as one unit and filter chips bled into the list on the way past. */}
      <View style={styles.body}>
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
            style={styles.flatlist}
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
            renderItem={({ item: row, index }) => <CatalogCard row={row} index={index} onApply={setApplyFor} />}
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
      </View>

      <ApplySheet course={applyFor} onClose={() => setApplyFor(null)} />
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
    <ScrollView
      horizontal
      style={styles.filterScroll}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.filterRow}>
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

function CatalogCard({
  row,
  index,
  onApply,
}: {
  row: Row;
  index: number;
  onApply: (course: PmajayCourse) => void;
}) {
  const { language } = useStore();
  const { c, radius } = useTheme();
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
          {q.notionalHours != null && <Chip label={`${q.notionalHours} h`} icon="time" tone="sun" />}
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

  const course = row.item;
  return (
    <Card index={index} style={{ gap: 10 }}>
      <View style={styles.badgeRow}>
        <View style={[styles.schemeBadge, { backgroundColor: c.text, borderRadius: radius.sm }]}>
          <Txt variant="caption" style={{ color: '#fff', fontWeight: '600' }}>
            PM-AJAY · {course.subCourseCode}
          </Txt>
        </View>
        <Chip label={course.courseLevel} icon="ribbon" tone="violet" />
      </View>
      <Txt variant="h2">{course.subCourseName}</Txt>
      <View style={styles.chipRow}>
        <Chip label={course.sector} />
        {!!course.subSector && course.subSector !== course.sector && <Chip label={course.subSector} tone="info" />}
      </View>
      <Txt variant="caption" tone="faint">
        {course.courseName}
      </Txt>
      <Button label={t.apply} variant="success" size="md" icon="arrow-forward" onPress={() => onApply(course)} />
    </Card>
  );
}

/** Placeholder confirmation until real applications are wired up. A Modal, not
 *  Alert — react-native-web doesn't implement Alert, so it silently no-ops. */
function ApplySheet({ course, onClose }: { course: PmajayCourse | null; onClose: () => void }) {
  const { language } = useStore();
  const { c, radius, elevation } = useTheme();
  const t = UI_STRINGS[language ?? 'hi'];

  return (
    <Modal visible={course !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.sheetBackdrop} onPress={onClose}>
        <Pressable style={[styles.sheet, { backgroundColor: c.surface }, elevation('float')]} onPress={() => {}}>
          <View style={[styles.sheetIcon, { backgroundColor: c.successSoft, borderRadius: radius.lg }]}>
            <Ionicons name="document-text" size={26} color={c.successDark} />
          </View>
          <Txt variant="title" center style={{ marginTop: 14 }}>
            {t.apply}
          </Txt>
          {course && (
            <Txt variant="label" tone="dim" center style={{ marginTop: 4 }}>
              {course.subCourseName}
            </Txt>
          )}
          <Txt variant="body" tone="dim" center style={{ marginTop: 12 }}>
            {t.applyComingSoon}
          </Txt>
          <Button label={t.cancel} variant="secondary" size="md" onPress={onClose} style={{ marginTop: 20 }} />
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 10, gap: 3 },
  tabs: { flexDirection: 'row', marginHorizontal: 20, padding: 4, gap: 4 },
  tabBtn: { flex: 1, paddingVertical: 9, alignItems: 'center', justifyContent: 'center' },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginHorizontal: 20,
    marginTop: 12,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1.5,
  },
  searchInput: { flex: 1, fontSize: 15, paddingVertical: 0 },
  filterScroll: { flexGrow: 0, flexShrink: 0 },
  filterRow: { gap: 8, paddingHorizontal: 20, paddingTop: 12 },
  filterChip: { paddingHorizontal: 13, paddingVertical: 8, borderWidth: 1.5 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32 },
  body: { flex: 1 },
  flatlist: { flex: 1 },
  list: { padding: 20, paddingTop: 14, gap: 12 },
  badgeRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  schemeBadge: { paddingHorizontal: 10, paddingVertical: 6 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  pager: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 16 },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(12,20,40,0.5)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 28,
  },
  sheet: { alignSelf: 'stretch', borderRadius: 28, padding: 24, alignItems: 'center' },
  sheetIcon: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center' },
});
