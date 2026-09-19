import { useState, useCallback, useEffect, type Dispatch, type SetStateAction } from 'react';

export interface UseBatchStudentSelectionProps<T extends { admNo: string; roll: number | string }> {
  records: T[];
}

export interface UseBatchStudentSelectionReturn {
  selectedIds: string[];
  setSelectedIds: Dispatch<SetStateAction<string[]>>;
  selectAll: () => void;
  clearAll: () => void;
  toggleId: (id: string) => void;
  isSelected: (id: string) => boolean;
  selectedCount: number;
  totalCount: number;
  isAllSelected: boolean;
  isNoneSelected: boolean;
  rangeFrom: string;
  setRangeFrom: (val: string) => void;
  rangeTo: string;
  setRangeTo: (val: string) => void;
  applyRollRange: () => void;
}

export function useBatchStudentSelection<T extends { admNo: string; roll: number | string }>({
  records
}: UseBatchStudentSelectionProps<T>): UseBatchStudentSelectionReturn {
  const [selectedIds, setSelectedIds] = useState<string[]>(() => records.map(r => r.admNo));
  const [rangeFrom, setRangeFrom] = useState<string>('1');
  const [rangeTo, setRangeTo] = useState<string>(() => String(records.length || ''));

  // Sync selection automatically when records array identity/length changes
  useEffect(() => {
    setSelectedIds(records.map(r => r.admNo));
    setRangeFrom('1');
    setRangeTo(String(records.length || ''));
  }, [records]);

  const selectAll = useCallback(() => {
    setSelectedIds(records.map(r => r.admNo));
  }, [records]);

  const clearAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const toggleId = useCallback((id: string) => {
    setSelectedIds(prev => (prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]));
  }, []);

  const isSelected = useCallback(
    (id: string) => selectedIds.includes(id),
    [selectedIds]
  );

  const applyRollRange = useCallback(() => {
    const from = parseInt(rangeFrom, 10);
    const to = parseInt(rangeTo, 10);
    if (isNaN(from) || isNaN(to) || from > to) return;

    const filtered = records
      .filter(st => {
        const rollNum = Number(st.roll);
        return !isNaN(rollNum) && rollNum >= from && rollNum <= to;
      })
      .map(st => st.admNo);

    setSelectedIds(filtered);
  }, [rangeFrom, rangeTo, records]);

  return {
    selectedIds,
    setSelectedIds,
    selectAll,
    clearAll,
    toggleId,
    isSelected,
    selectedCount: selectedIds.length,
    totalCount: records.length,
    isAllSelected: records.length > 0 && selectedIds.length === records.length,
    isNoneSelected: selectedIds.length === 0,
    rangeFrom,
    setRangeFrom,
    rangeTo,
    setRangeTo,
    applyRollRange
  };
}
