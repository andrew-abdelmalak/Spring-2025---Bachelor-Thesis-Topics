import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Filter, Download, X, GripVertical } from 'lucide-react';
import * as XLSX from 'xlsx';
import { projectData } from './Data';

const Card = ({ children, className = "" }) => (
  <div className={`p-4 bg-white shadow rounded-lg border border-gray-100 hover:border-blue-200 transition-all ${className}`}>
    {children}
  </div>
);

const CardContent = ({ children }) => (
  <div className="p-2">{children}</div>
);

const HighlightedText = ({ text = "", searchTerm = "" }) => {
  if (!searchTerm) return text;
  const parts = text.split(new RegExp(`(${searchTerm})`, 'gi'));
  return (
    <span>
      {parts.map((part, i) => 
        part.toLowerCase() === searchTerm.toLowerCase() ? 
          <span key={i} className="bg-yellow-200 px-1 rounded">{part}</span> : 
          part
      )}
    </span>
  );
};

export default function ThesisComparisonSystem() {
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProjects, setSelectedProjects] = useState(new Set());
  const [priorityList, setPriorityList] = useState([]);
  const [showPriorityList, setShowPriorityList] = useState(false);
  
  const [multiFilters, setMultiFilters] = useState({
    supervisors: new Set(),
    departments: new Set(),
    fields: new Set(),
    eligibleDepts: new Set(),
    searchTerm: ''
  });

  const parseSupervisors = (supervisorString) => {
    return supervisorString.split(/,\s*/).map(s => s.trim());
  };

  const normalizeDepartment = (dept) => {
    if (dept.includes('Engineering')) return 'Engineering';
    if (dept.includes('Design and Production')) return 'Design and Production';
    return dept;
  };

  const uniqueValues = useMemo(() => {
    const supervisorSet = new Set();
    const departmentSet = new Set();
    
    projectData.forEach(project => {
      parseSupervisors(project.supervisorName).forEach(supervisor => {
        supervisorSet.add(supervisor);
      });
      departmentSet.add(normalizeDepartment(project.department));
    });

    return {
      supervisors: [...supervisorSet].sort(),
      departments: [...departmentSet].sort(),
      fields: [...new Set(projectData.map(p => p.researchField))].sort(),
      eligibleDepts: [...new Set(projectData.flatMap(p => p.eligibleDepartments))].sort()
    };
  }, []);

  const handleMultiFilterChange = (category, value) => {
    setMultiFilters(prev => {
      const newFilters = { ...prev };
      const categorySet = new Set(prev[category]);
      categorySet.has(value) ? categorySet.delete(value) : categorySet.add(value);
      newFilters[category] = categorySet;
      return newFilters;
    });
  };

  const toggleProjectSelection = (projectTitle) => {
    setSelectedProjects(prev => {
      const newSelection = new Set(prev);
      newSelection.has(projectTitle) ? newSelection.delete(projectTitle) : newSelection.add(projectTitle);
      return newSelection;
    });
  };

  const addToPriorityList = () => {
    setPriorityList(prev => {
      const newList = [...prev];
      filteredData
        .filter(project => selectedProjects.has(project.projectTitle))
        .forEach(project => {
          if (!newList.find(p => p.projectTitle === project.projectTitle)) {
            newList.push(project);
          }
        });
      return newList;
    });
    setSelectedProjects(new Set());
  };

  const moveProject = (index, direction) => {
    setPriorityList(prev => {
      const newList = [...prev];
      const newIndex = direction === 'up' ? index - 1 : index + 1;
      
      if (newIndex >= 0 && newIndex < newList.length) {
        [newList[index], newList[newIndex]] = [newList[newIndex], newList[index]];
      }
      return newList;
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

  const exportToExcel = () => {
    try {
      const exportData = filteredData.map(project => ({
        'Supervisor Name': project.supervisorName,
        'Supervisor Email': project.supervisorEmail,
        'Department': project.department,
        'Project Title': project.projectTitle,
        'Research Field': project.researchField,
        'Project Description': project.projectDescription,
        'Project Methodology': project.projectMethodology,
        'Qualifications': project.qualifications,
        'Eligible Departments': project.eligibleDepartments.join(', '),
        'Further Comments': project.furtherComments
      }));

      const ws = XLSX.utils.json_to_sheet(exportData);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Thesis Projects');
      XLSX.writeFile(wb, 'thesis_projects.xlsx');
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const filteredData = useMemo(() => {
    return projectData.filter((project) => {
      const matchesSearch = !multiFilters.searchTerm || 
        Object.values(project).some(value => 
          value.toString().toLowerCase().includes(multiFilters.searchTerm.toLowerCase())
        );

      const supervisorsList = parseSupervisors(project.supervisorName);
      const matchesSupervisor = multiFilters.supervisors.size === 0 || 
        supervisorsList.some(supervisor => 
          multiFilters.supervisors.has(supervisor));

      const matchesDepartment = multiFilters.departments.size === 0 || 
        multiFilters.departments.has(normalizeDepartment(project.department));

      const matchesField = multiFilters.fields.size === 0 || 
        multiFilters.fields.has(project.researchField);

      const matchesEligibility = multiFilters.eligibleDepts.size === 0 || 
        project.eligibleDepartments.some(dept => 
          multiFilters.eligibleDepts.has(dept));

      return matchesSearch && matchesSupervisor && matchesDepartment && 
             matchesField && matchesEligibility;
    });
  }, [multiFilters]);const PriorityListModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-3/4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Priority List</h2>
          <button onClick={() => setShowPriorityList(false)} className="text-gray-500 hover:text-gray-700">
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="space-y-2">
          {priorityList.map((project, index) => (
            <div key={project.projectTitle} className="flex items-center gap-4 p-2 bg-gray-50 rounded">
              <GripVertical className="h-5 w-5 text-gray-400" />
              <span className="flex-1">{project.projectTitle}</span>
              <div className="text-sm text-gray-500">
                {parseSupervisors(project.supervisorName).join(' | ')}
              </div>
              <span className="text-gray-500">Position: {index + 1}</span>
              <button
                onClick={() => moveProject(index, 'up')}
                disabled={index === 0}
                className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
              >
                ↑
              </button>
              <button
                onClick={() => moveProject(index, 'down')}
                disabled={index === priorityList.length - 1}
                className="p-1 hover:bg-gray-200 rounded disabled:opacity-50"
              >
                ↓
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4">
      <header className="bg-white shadow-lg rounded-xl mb-6 border border-gray-200">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              Thesis Projects Comparison
            </h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPriorityList(true)}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-sm"
              >
                Priority List ({priorityList.length})
              </button>
              {selectedProjects.size > 0 && (
                <button
                  onClick={addToPriorityList}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all shadow-sm"
                >
                  Add to Priority ({selectedProjects.size})
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 bg-white border rounded-lg shadow-sm hover:bg-gray-50 transition-all"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters {showFilters ? 'Hide' : 'Show'}
              </button>
              <button 
                onClick={exportToExcel}
                className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-600 text-white rounded-lg hover:from-purple-600 hover:to-pink-700 transition-all shadow-sm"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search all fields..."
              className="pl-10 w-full p-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
              value={multiFilters.searchTerm}
              onChange={(e) => setMultiFilters(prev => ({...prev, searchTerm: e.target.value}))}
            />
          </div>
        </div>
      </header>

      {showFilters && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg shadow-sm">
          {Object.entries(uniqueValues).map(([category, values]) => (
            <div key={category} className="space-y-2">
              <h3 className="font-medium capitalize">{category.replace(/([A-Z])/g, ' $1').trim()}</h3>
              <div className="space-y-1 max-h-40 overflow-y-auto">
                {values.map(value => (
                  <label key={value} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={multiFilters[category].has(value)}
                      onChange={() => handleMultiFilterChange(category, value)}
                      className="rounded"
                    />
                    <span className="text-sm">{value}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl shadow-lg border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-gray-50 to-blue-50">
              <tr>
                <th className="px-6 py-3"></th>
                <th className="px-6 py-3"></th>
                <th className="px-6 py-3 text-left">Supervisor(s)</th>
                <th className="px-6 py-3 text-left">Project Title</th>
                <th className="px-6 py-3 text-left">Research Field</th>
                <th className="px-6 py-3 text-left">Department</th>
                <th className="px-6 py-3 text-left">Eligibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((project, index) => (
                <React.Fragment key={project.projectTitle}>
                  <tr className="hover:bg-blue-50 transition-colors">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedProjects.has(project.projectTitle)}
                        onChange={() => toggleProjectSelection(project.projectTitle)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => setExpandedRows(prev => {
                          const newSet = new Set(prev);
                          prev.has(index) ? newSet.delete(index) : newSet.add(index);
                          return newSet;
                        })}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {expandedRows.has(index) ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm">
                        {parseSupervisors(project.supervisorName).map((supervisor, idx) => (
                          <div key={idx} className="mb-1">
                            <HighlightedText 
                              text={supervisor} 
                              searchTerm={multiFilters.searchTerm}
                            />
                            {idx === 0 && (
                              <span className="text-xs ml-1 bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full">
                                Primary
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                      <div className="text-sm text-gray-500">
                        <HighlightedText 
                          text={project.supervisorEmail}
                          searchTerm={multiFilters.searchTerm}
                        />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <HighlightedText 
                        text={project.projectTitle}
                        searchTerm={multiFilters.searchTerm}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <HighlightedText 
                        text={project.researchField}
                        searchTerm={multiFilters.searchTerm}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <HighlightedText 
                        text={project.department}
                        searchTerm={multiFilters.searchTerm}
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {project.eligibleDepartments.map((dept, idx) => (
                          <span key={idx} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                            <HighlightedText 
                              text={dept}
                              searchTerm={multiFilters.searchTerm}
                            />
                          </span>
                        ))}
                      </div>
                    </td>
                  </tr>
                  {expandedRows.has(index) && (
                    <tr>
                      <td colSpan="7" className="px-6 py-4 bg-blue-50">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <Card>
                            <CardContent>
                              <h3 className="font-medium text-gray-900 mb-2">Project Description</h3>
                              <p className="text-sm text-gray-600">
                                <HighlightedText 
                                  text={project.projectDescription}
                                  searchTerm={multiFilters.searchTerm}
                                />
                              </p>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent>
                              <h3 className="font-medium text-gray-900 mb-2">Methodology</h3>
                              <div className="text-sm text-gray-600">
                                {project.projectMethodology.split('\n').map((step, i) => (
                                  <div key={i} className="flex items-start mb-2">
                                    <span className="mr-2">•</span>
                                    <HighlightedText 
                                      text={step}
                                      searchTerm={multiFilters.searchTerm}
                                    />
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent>
                              <h3 className="font-medium text-gray-900 mb-2">Qualifications & Requirements</h3>
                              <p className="text-sm text-gray-600">
                                <HighlightedText 
                                  text={project.qualifications}
                                  searchTerm={multiFilters.searchTerm}
                                />
                              </p>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent>
                              <h3 className="font-medium text-gray-900 mb-2">Additional Information</h3>
                              {project.furtherComments !== "N/A" && (
                                <p className="text-sm text-gray-600">
                                  <HighlightedText 
                                    text={project.furtherComments}
                                    searchTerm={multiFilters.searchTerm}
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
    </div>
  );
}