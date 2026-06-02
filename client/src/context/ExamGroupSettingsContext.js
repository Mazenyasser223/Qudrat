import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import axios from 'axios';
import { DEFAULT_CURRICULUM_GROUP_ORDER } from '../utils/examGroupOrder';
import { resolveGroupName } from '../utils/curriculumGroupNames';

const ExamGroupSettingsContext = createContext(null);

export function ExamGroupSettingsProvider({ children }) {
  const [customGroups, setCustomGroups] = useState([]);
  const [curriculumGroupOrder, setCurriculumGroupOrder] = useState(DEFAULT_CURRICULUM_GROUP_ORDER);
  const [curriculumGroupNames, setCurriculumGroupNames] = useState({});
  const [loading, setLoading] = useState(true);

  const applySettings = useCallback((data) => {
    if (Array.isArray(data?.data)) {
      setCustomGroups(data.data);
    }
    if (Array.isArray(data?.curriculumGroupOrder)) {
      setCurriculumGroupOrder(data.curriculumGroupOrder);
    }
    if (data?.curriculumGroupNames) {
      setCurriculumGroupNames(data.curriculumGroupNames);
    }
  }, []);

  const refreshSettings = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get('/api/exam-groups', { headers });
      applySettings(response.data);
    } catch (error) {
      console.error('Error fetching exam group settings:', error);
    } finally {
      setLoading(false);
    }
  }, [applySettings]);

  useEffect(() => {
    refreshSettings();
  }, [refreshSettings]);

  const getGroupName = useCallback(
    (groupNumber) => resolveGroupName(groupNumber, { curriculumGroupNames, customGroups }),
    [curriculumGroupNames, customGroups]
  );

  const value = useMemo(
    () => ({
      customGroups,
      curriculumGroupOrder,
      curriculumGroupNames,
      loading,
      getGroupName,
      refreshSettings,
      applySettings,
      setCurriculumGroupNames
    }),
    [
      customGroups,
      curriculumGroupOrder,
      curriculumGroupNames,
      loading,
      getGroupName,
      refreshSettings,
      applySettings
    ]
  );

  return (
    <ExamGroupSettingsContext.Provider value={value}>
      {children}
    </ExamGroupSettingsContext.Provider>
  );
}

export function useExamGroupSettings() {
  const context = useContext(ExamGroupSettingsContext);
  if (!context) {
    throw new Error('useExamGroupSettings must be used within ExamGroupSettingsProvider');
  }
  return context;
}
