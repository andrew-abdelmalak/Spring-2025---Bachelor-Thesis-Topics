import React, { useState, useMemo, useEffect } from 'react';
import { Search, ChevronDown, ChevronUp, Filter, X, GripVertical, HelpCircle, Sun, Moon, Trash2 } from 'lucide-react';
import { projectData } from './Data';
import * as XLSX from 'xlsx';

// Card components remain the same as they haven't changed
const Card = ({ children, className = "", isDark = false }) => (
  <div className={`p-4 shadow rounded-lg transition-all ${isDark ? 'bg-gray-800 border-gray-700 hover:border-blue-700' : 'bg-white border border-gray-100 hover:border-blue-200'} ${className}`}>
    {children}
  </div>
);

const CardContent = ({ children, isDark = false }) => (
  <div className={`p-2 ${isDark ? 'text-gray-300' : ''}`}>{children}</div>
);

const FilterDropdown = ({ label, options, selected, onChange, darkMode }) => {
  const [isOpen, setIsOpen] = useState(false);

  // Filter out options with zero count
  const availableOptions = options.filter(([_, count]) => count > 0);
  const unavailableOptions = options.filter(([_, count]) => count === 0);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-2 text-left rounded-lg flex justify-between items-center
          ${darkMode ? 
            'bg-gray-700 hover:bg-gray-600 text-white' : 
            'bg-white border border-gray-200 hover:border-gray-300'}`}
      >
        <span className="truncate">
          {selected.size > 0 ? `${label} (${selected.size})` : label}
        </span>
        <ChevronDown className={`h-4 w-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
      </button>
      
      {isOpen && (
        <div className={`absolute z-50 w-full mt-1 rounded-lg shadow-lg overflow-hidden
          ${darkMode ? 'bg-gray-700 border border-gray-600' : 'bg-white border border-gray-200'}`}>
          <div className="max-h-60 overflow-y-auto">
            {availableOptions.map(([value, count]) => (
              <label
                key={value}
                className={`flex items-center px-4 py-2 cursor-pointer
                  ${darkMode ? 
                    'hover:bg-gray-600 text-gray-200' : 
                    'hover:bg-gray-50 text-gray-700'}`}
              >
                <input
                  type="checkbox"
                  checked={selected.has(value)}
                  onChange={() => onChange(value)}
                  className="rounded mr-3"
                />
                <span className="flex-1">{value}</span>
                <span className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  ({count})
                </span>
              </label>
            ))}
            {unavailableOptions.map(([value, count]) => (
              <label
                key={value}
                className={`flex items-center px-4 py-2 cursor-not-allowed opacity-50
                  ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}
              >
                <input
                  type="checkbox"
                  disabled
                  className="rounded mr-3"
                />
                <span className="flex-1">{value}</span>
                <span className="text-sm">
                  (0)
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// HighlightedText component remains the same as it hasn't changed
const HighlightedText = ({ text = "", searchTerm = "" }) => {
  if (!searchTerm || !text) return <>{text}</>;

  const parts = [];
  let lastIndex = 0;
  let index = text.toLowerCase().indexOf(searchTerm.toLowerCase());

  while (index !== -1) {
      parts.push(text.slice(lastIndex, index));
      parts.push(
          <span className="bg-yellow-200 rounded px-1">
              {text.slice(index, index + searchTerm.length)}
          </span>,
      );
      lastIndex = index + searchTerm.length;
      index = text.toLowerCase().indexOf(searchTerm.toLowerCase(), lastIndex);
  }

  parts.push(text.slice(lastIndex));

  return <>{parts}</>;
};

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  confirmColor = "red",
  isDark = false,
}) => {
  if (!isOpen) return null;
  return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center">
          <div
              className={`rounded-lg p-6 w-full max-w-md mx-4 ${
                  isDark ? 'bg-gray-800 text-white' : 'bg-white'
              }`}
          >
              <h3 className="text-lg font-medium mb-4">{message}</h3>
              <div className="flex justify-end gap-4">
                  <button
                      onClick={onClose}
                      className={`px-4 py-2 rounded-lg ${
                          isDark
                              ? 'bg-gray-700 hover:bg-gray-600'
                              : 'bg-gray-200 hover:bg-gray-300'
                      }`}
                  >
                      {cancelLabel}
                  </button>
                  <button
                      onClick={onConfirm}
                      className={`px-4 py-2 text-white rounded-lg hover:bg-${confirmColor}-600 bg-${confirmColor}-500`}
                  >
                      {confirmLabel}
                  </button>
              </div>
          </div>
      </div>
  );
};

export default function ThesisComparisonSystem() {
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const savedMode = localStorage.getItem('darkMode');
      if (savedMode !== null) {
        return savedMode === 'true';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState(new Set());
  const [priorityList, setPriorityList] = useState([]);
  const [showPriorityList, setShowPriorityList] = useState(false);
  const [showClearConfirmation, setShowClearConfirmation] = useState(false);
  const [showWhatsAppConfirmation, setShowWhatsAppConfirmation] = useState(false);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  
  const [multiFilters, setMultiFilters] = useState({
    supervisors: new Set(),
    departments: new Set(),
    fields: new Set(),
    eligibleDepts: new Set(),
    searchTerm: ''
  });

  useEffect(() => {
    localStorage.setItem('darkMode', darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  useEffect(() => {
    const savedPriorityList = localStorage.getItem('priorityList');
    if (savedPriorityList) {
      try {
        setPriorityList(JSON.parse(savedPriorityList));
      } catch (error) {
        console.error('Error loading priority list:', error);
        setPriorityList([]);
      }
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('priorityList', JSON.stringify(priorityList));
    } catch (error) {
      console.error('Error saving priority list:', error);
    }
  }, [priorityList]);

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key ? 
        prev.direction === 'asc' ? 'desc' : 
        prev.direction === 'desc' ? null : 'asc' 
        : 'asc',
    }));
  };

  const processedData = useMemo(() => {
    return projectData.map(project => ({
      ...project,
      projectDescription: project.projectDescription === 'N/A' ? '' : project.projectDescription,
      qualifications: project.qualifications === 'N/A' ? '' : project.qualifications,
      furtherComments: project.furtherComments === 'N/A' ? '' : project.furtherComments,
      projectMethodology: project.projectMethodology === 'N/A' ? '' : project.projectMethodology,
      supervisorName: project.supervisorName === 'N/A' ? '' : project.supervisorName,
      supervisorEmail: project.supervisorEmail === 'N/A' ? '' : project.supervisorEmail,
      department: project.department === 'N/A' ? '' : project.department,
      researchField: project.researchField === 'N/A' ? '' : project.researchField,
    }));
  }, []);

  const filteredAndSortedData = useMemo(() => {
    let result = processedData.filter((project) => {
      const matchesSearch = !multiFilters.searchTerm || 
        Object.values(project).some(value => 
          String(value).toLowerCase().includes(multiFilters.searchTerm.toLowerCase())
        );

      const supervisorsList = project.supervisorName ? project.supervisorName.split(/,\s*/) : [];
      const matchesSupervisor = multiFilters.supervisors.size === 0 || 
        supervisorsList.some(supervisor => multiFilters.supervisors.has(supervisor.trim()));

      const matchesDepartment = multiFilters.departments.size === 0 || 
        multiFilters.departments.has(project.department);

      const matchesField = multiFilters.fields.size === 0 || 
        multiFilters.fields.has(project.researchField);

      const matchesEligibility = multiFilters.eligibleDepts.size === 0 || 
        (project.eligibleDepartments || []).some(dept => multiFilters.eligibleDepts.has(dept));

      return matchesSearch && matchesSupervisor && matchesDepartment && 
             matchesField && matchesEligibility;
    });

    if (sortConfig.key && sortConfig.direction) {
      result.sort((a, b) => {
        const aValue = String(a[sortConfig.key] || '').toLowerCase();
        const bValue = String(b[sortConfig.key] || '').toLowerCase();
        if (sortConfig.direction === 'asc') {
          return aValue.localeCompare(bValue);
        }
        return bValue.localeCompare(aValue);
      });
    }

    return result;
  }, [multiFilters, sortConfig, processedData]);

  const uniqueValues = useMemo(() => {
    const getFilteredCounts = (field, getValue = item => item[field]) => {
      const counts = new Map();
      
      filteredAndSortedData.forEach(item => {
        const values = Array.isArray(getValue(item)) ? 
          getValue(item) : 
          [getValue(item)].flatMap(v => v ? v.split(/,\s*/) : []);
        
        values.forEach(value => {
          if (value) {
            counts.set(value.trim(), (counts.get(value.trim()) || 0) + 1);
          }
        });
      });
      
      return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
    };

    return {
      supervisors: getFilteredCounts('supervisorName', item => item.supervisorName?.split(/,\s*/)),
      departments: getFilteredCounts('department'),
      fields: getFilteredCounts('researchField'),
      eligibleDepts: getFilteredCounts('eligibleDepartments')
    };
  }, [filteredAndSortedData]);

  const exportToExcel = (data, filename) => {
    try {
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Thesis Projects');
      XLSX.writeFile(wb, filename);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleMultiFilterChange = (category, value) => {
    setMultiFilters(prev => {
      const newFilters = { ...prev };
      const categorySet = new Set(prev[category]);
      categorySet.has(value) ? categorySet.delete(value) : categorySet.add(value);
      newFilters[category] = categorySet;
      return newFilters;
    });
  };

  const clearFilters = () => {
    setMultiFilters({
      supervisors: new Set(),
      departments: new Set(),
      fields: new Set(),
      eligibleDepts: new Set(),
      searchTerm: ''
    });
  };

  const clearPriorityList = () => {
    setPriorityList([]);
    setShowClearConfirmation(false);
  };

  const handleWhatsAppHelp = () => {
    const message = encodeURIComponent("Samooo 3lekooo El Tlaga Feha Maya 2al-Ana G3an Awee");
    window.open(`https://wa.me/201286735310?text=${message}`);
    setShowWhatsAppConfirmation(false);
  };

  const removeFromPriorityList = (projectTitle) => {
    setPriorityList(prev => prev.filter(project => project.projectTitle !== projectTitle));
  };

  const SortableHeader = ({ title, sortKey }) => {
    const isSorted = sortConfig.key === sortKey;
    return (
      <th
        className={`px-4 py-3 text-left cursor-pointer select-none
          ${darkMode ? 'text-gray-200 hover:text-white' : 'text-gray-700 hover:text-black'}`}
        onClick={() => handleSort(sortKey)}
      >
        <div className="flex items-center gap-1">
          {title}
          {isSorted && (
            <span className="text-xs">
              {sortConfig.direction === 'asc' ? '↑' : 
               sortConfig.direction === 'desc' ? '↓' : ''}
            </span>
          )}
        </div>
      </th>
    );
  };

  const PriorityListModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40">
      <div className={`rounded-lg p-6 w-full md:w-3/4 max-h-[80vh] overflow-y-auto m-4 
        ${darkMode ? 'bg-gray-800 text-white' : 'bg-white'}`}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Priority List</h2>
          <div className="flex gap-2">
          <button
              onClick={() => exportToExcel(priorityList, 'priority_list.xlsx')}
              className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600"
            >
              Export List
            </button>
            <button
              onClick={() => setShowClearConfirmation(true)}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
            >
              Clear List
            </button>
            <button onClick={() => setShowPriorityList(false)} className="text-gray-500 hover:text-gray-700">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>
        
        <div className="space-y-2">
          {priorityList.map((project, index) => (
            <div key={project.projectTitle} className={`flex items-center gap-4 p-4 rounded
              ${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
              <GripVertical className="h-5 w-5 text-gray-400 cursor-move" />
              <div className="flex-1">
                <div className={`font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  {project.projectTitle || ''}
                </div>
                <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {project.supervisorName || ''}
                </div>
              </div>
              <span className={`${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                Position: {index + 1}
              </span>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setPriorityList(prev => {
                      const newList = [...prev];
                      if (index > 0) {
                        [newList[index], newList[index - 1]] = [newList[index - 1], newList[index]];
                      }
                      return newList;
                    });
                  }}
                  disabled={index === 0}
                  className={`p-2 rounded disabled:opacity-50 
                    ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                >
                  ↑
                </button>
                <button
                  onClick={() => {
                    setPriorityList(prev => {
                      const newList = [...prev];
                      if (index < newList.length - 1) {
                        [newList[index], newList[index + 1]] = [newList[index + 1], newList[index]];
                      }
                      return newList;
                    });
                  }}
                  disabled={index === priorityList.length - 1}
                  className={`p-2 rounded disabled:opacity-50 
                    ${darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200'}`}
                >
                  ↓
                </button>
                <button
                  onClick={() => removeFromPriorityList(project.projectTitle)}
                  className={`p-2 rounded text-red-500 hover:bg-red-100
                    ${darkMode ? 'hover:bg-red-900 hover:text-red-300' : ''}`}
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              </div>
            </div>
          ))}
          {priorityList.length === 0 && (
            <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
              No projects in priority list yet. Add projects from the main table.
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className={`min-h-screen p-4 mx-auto max-w-8xl transition-colors
      ${darkMode ? 'bg-gray-900' : 'bg-gradient-to-br from-gray-50 to-blue-50'}`}>
      <header className={`shadow-lg rounded-xl mb-6 mx-4
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
            <div>
              <h1 className={`text-3xl font-bold bg-clip-text text-transparent
                ${darkMode ? 'bg-gradient-to-r from-blue-400 to-purple-400' : 
                'bg-gradient-to-r from-blue-600 to-purple-600'}`}>
                Thesis Projects Comparison
              </h1>
              <div className={`flex items-center gap-2 text-sm mt-1
                ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                <span>Projects: {filteredAndSortedData.length}</span>
                <span>•</span>
                <span>Last Updated: 12/24/2024 12:09:47 PM</span>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setDarkMode(!darkMode)}
                className={`p-2 rounded-lg transition-colors
                  ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white hover:bg-gray-100'}`}
              >
                {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </button>
              <button
                onClick={() => exportToExcel(filteredAndSortedData, 'thesis_projects.xlsx')}
                className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600"
              >
                Export to Excel
              </button>
              <button
                onClick={() => setShowPriorityList(true)}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 
                  text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-sm"
              >
                Priority List ({priorityList.length})
              </button>
              {selectedProjects.size > 0 && (
                <button
                  onClick={() => {
                    setPriorityList(prev => {
                      const newList = [...prev];
                      filteredAndSortedData
                        .filter(project => selectedProjects.has(project.projectTitle))
                        .forEach(project => {
                          if (!newList.find(p => p.projectTitle === project.projectTitle)) {
                            newList.push(project);
                          }
                        });
                      return newList;
                    });
                    setSelectedProjects(new Set());
                  }}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 
                    text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm"
                >
                  Add to Priority ({selectedProjects.size})
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center px-4 py-2 rounded-lg shadow-sm transition-all
                  ${darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-white border hover:bg-gray-50'}`}
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters {showFilters ? 'Hide' : 'Show'}
              </button>
              <button
                onClick={() => setShowWhatsAppConfirmation(true)}
                className="flex items-center px-4 py-2 bg-green-500 text-white rounded-lg 
                  hover:bg-green-600 transition-all shadow-sm"
              >
                <HelpCircle className="h-4 w-4 mr-2" />
                Help
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className={`absolute left-3 top-2.5 h-4 w-4
              ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            <input
              type="text"
              placeholder="Search all fields..."
              className={`pl-10 w-full p-2 rounded-lg transition-all
                ${darkMode ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400' : 
                'border focus:ring-2 focus:ring-blue-500 focus:border-blue-500'}`}
              value={multiFilters.searchTerm}
              onChange={(e) => setMultiFilters(prev => ({...prev, searchTerm: e.target.value}))}
            />
          </div>
        </div>
      </header>

      {showFilters && (
        <div className={`mb-6 p-4 rounded-xl shadow-sm mx-4
          ${darkMode ? 'bg-gray-800' : 'bg-white'}`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className={`text-lg font-medium ${darkMode ? 'text-white' : ''}`}>
              Filters
            </h2>
            {Object.values(multiFilters).some(filter => 
              filter instanceof Set ? filter.size > 0 : filter !== ''
            ) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 text-sm text-red-600 hover:text-red-700"
              >
                Clear All
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <FilterDropdown
              label="Supervisors"
              options={uniqueValues.supervisors}
              selected={multiFilters.supervisors}
              onChange={(value) => handleMultiFilterChange('supervisors', value)}
              darkMode={darkMode}
            />
            <FilterDropdown
              label="Departments"
              options={uniqueValues.departments}
              selected={multiFilters.departments}
              onChange={(value) => handleMultiFilterChange('departments', value)}
              darkMode={darkMode}
            />
            <FilterDropdown
              label="Research Fields"
              options={uniqueValues.fields}
              selected={multiFilters.fields}
              onChange={(value) => handleMultiFilterChange('fields', value)}
              darkMode={darkMode}
            />
            <FilterDropdown
              label="Eligible Departments"
              options={uniqueValues.eligibleDepts}
              selected={multiFilters.eligibleDepts}
              onChange={(value) => handleMultiFilterChange('eligibleDepts', value)}
              darkMode={darkMode}
            />
          </div>
        </div>
      )}

      <div className={`rounded-xl shadow-lg mx-4
        ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border border-gray-200'}`}>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className={darkMode ? 'bg-gray-700' : 'bg-gradient-to-r from-gray-50 to-blue-50'}>
              <tr>
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3 w-8"></th>
                <SortableHeader title="Supervisor(s)" sortKey="supervisorName" />
                <SortableHeader title="Project Title" sortKey="projectTitle" />
                <SortableHeader title="Research Field" sortKey="researchField" />
                <SortableHeader title="Department" sortKey="department" />
                <th className={`px-4 py-3 text-left
                  ${darkMode ? 'text-gray-200' : ''}`}>Eligibility</th>
              </tr>
            </thead>
            <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
              {filteredAndSortedData.map((project, index) => (
                <React.Fragment key={project.projectTitle}>
                  <tr 
                    className={`transition-colors cursor-pointer
                      ${darkMode ? 
                        'hover:bg-gray-700' : 
                        'hover:bg-blue-50'}`}
                    onClick={() => {
                      setExpandedRows(prev => {
                        const newSet = new Set(prev);
                        prev.has(index) ? newSet.delete(index) : newSet.add(index);
                        return newSet;
                      });
                    }}
                  >
                    <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedProjects.has(project.projectTitle)}
                        onChange={() => {
                          setSelectedProjects(prev => {
                            const newSet = new Set(prev);
                            prev.has(project.projectTitle) ? 
                              newSet.delete(project.projectTitle) : 
                              newSet.add(project.projectTitle);
                            return newSet;
                          });
                        }}
                        className="rounded ml-4"
                      />
                    </td>
                    <td className="px-4 py-4">
                      {expandedRows.has(index) ? (
                        <ChevronUp className={`h-5 w-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      ) : (
                        <ChevronDown className={`h-5 w-5 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
                      )}
                    </td>
                    <td className={`px-4 py-4 ${darkMode ? 'text-gray-300' : ''}`}>
                      <div className="text-sm">
                        <HighlightedText 
                          text={project.supervisorName}
                          searchTerm={multiFilters.searchTerm}
                          isDark={darkMode}
                        />
                      </div>
                      <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        <HighlightedText 
                          text={project.supervisorEmail}
                          searchTerm={multiFilters.searchTerm}
                          isDark={darkMode}
                        />
                      </div>
                    </td>
                    <td className={`px-4 py-4 ${darkMode ? 'text-gray-300' : ''}`}>
                      <HighlightedText 
                        text={project.projectTitle}
                        searchTerm={multiFilters.searchTerm}
                        isDark={darkMode}
                      />
                    </td>
                    <td className={`px-4 py-4 ${darkMode ? 'text-gray-300' : ''}`}>
                      <HighlightedText 
                        text={project.researchField}
                        searchTerm={multiFilters.searchTerm}
                        isDark={darkMode}
                      />
                    </td>
                    <td className={`px-4 py-4 ${darkMode ? 'text-gray-300' : ''}`}>
                      <HighlightedText 
                        text={project.department}
                        searchTerm={multiFilters.searchTerm}
                        isDark={darkMode}
                      />
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(project.eligibleDepartments || []).map((dept, idx) => (
                          <span key={idx} className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                            ${darkMode ? 'bg-emerald-900 text-emerald-200' : 'bg-emerald-100 text-emerald-800'}`}>
                            <HighlightedText 
                              text={dept}
                              searchTerm={multiFilters.searchTerm}
                              isDark={darkMode}
                            />
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                  {expandedRows.has(index) && (
                    <tr>
                      <td colSpan="7" className={`px-6 py-4 ${darkMode ? 'bg-gray-700' : 'bg-blue-50'}`}>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card isDark={darkMode}>
                            <CardContent isDark={darkMode}>
                              <h3 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                Project Description
                              </h3>
                              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                              <HighlightedText 
                                  text={project.projectDescription}
                                  searchTerm={multiFilters.searchTerm}
                                  isDark={darkMode}
                                />
                              </p>
                            </CardContent>
                          </Card>

                          <Card isDark={darkMode}>
                            <CardContent isDark={darkMode}>
                              <h3 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                Methodology
                              </h3>
                              <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                {(project.projectMethodology || '').split('\n').map((step, i) => (
                                  <div key={i} className="flex items-start mb-2">
                                    <span className="mr-2">•</span>
                                    <HighlightedText 
                                      text={step}
                                      searchTerm={multiFilters.searchTerm}
                                      isDark={darkMode}
                                    />
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>

                          <Card isDark={darkMode}>
                            <CardContent isDark={darkMode}>
                              <h3 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                Qualifications & Requirements
                              </h3>
                              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                <HighlightedText 
                                  text={project.qualifications}
                                  searchTerm={multiFilters.searchTerm}
                                  isDark={darkMode}
                                />
                              </p>
                            </CardContent>
                          </Card>

                          <Card isDark={darkMode}>
                            <CardContent isDark={darkMode}>
                              <h3 className={`font-medium mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                                Additional Information
                              </h3>
                              {project.furtherComments && project.furtherComments !== "N/A" && (
                                <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                                  <HighlightedText 
                                    text={project.furtherComments}
                                    searchTerm={multiFilters.searchTerm}
                                    isDark={darkMode}
                                  />
                                </p>
                              )}
                            </CardContent>
                          </Card>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {showPriorityList && <PriorityListModal />}
      
      <ConfirmationModal
        isOpen={showClearConfirmation}
        onClose={() => setShowClearConfirmation(false)}
        onConfirm={clearPriorityList}
        message="Are you sure you want to clear the priority list? This action cannot be undone."
        isDark={darkMode}
      />

      <ConfirmationModal
        isOpen={showWhatsAppConfirmation}
        onClose={() => setShowWhatsAppConfirmation(false)}
        onConfirm={handleWhatsAppHelp}
        message="You will be redirected to WhatsApp to contact support. Continue?"
        isDark={darkMode}
      />
    </div>
  );
}