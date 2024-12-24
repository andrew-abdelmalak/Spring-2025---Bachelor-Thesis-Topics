import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronUp, Filter, Download, X, GripVertical } from 'lucide-react';
import * as XLSX from 'xlsx';
import { projectData } from './Data';

const Card = ({ children }) => (
  <div className="p-4 bg-white shadow rounded-lg">{children}</div>
);

const CardContent = ({ children }) => (
  <div className="p-2">{children}</div>
);

export default function ThesisComparisonSystem() {
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [filters, setFilters] = useState({
    supervisor: '',
    department: '',
    field: '',
    eligibility: '',
    searchTerm: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [activeFilters, setActiveFilters] = useState([]);
  const [selectedProjects, setSelectedProjects] = useState(new Set());
  const [priorityList, setPriorityList] = useState([]);
  const [showPriorityList, setShowPriorityList] = useState(false);

  const uniqueValues = useMemo(() => ({
    supervisors: [...new Set(projectData.map(p => p.supervisorName))],
    departments: [...new Set(projectData.map(p => p.department))],
    fields: [...new Set(projectData.map(p => p.researchField))],
    eligibleDepts: [...new Set(projectData.flatMap(p => p.eligibleDepartments))]
  }), []);

  const [multiFilters, setMultiFilters] = useState({
    supervisors: new Set(),
    departments: new Set(),
    fields: new Set(),
    eligibleDepts: new Set()
  });

  const handleMultiFilterChange = (category, value) => {
    setMultiFilters(prev => {
      const newFilters = { ...prev };
      const categorySet = new Set(prev[category]);
      
      if (categorySet.has(value)) {
        categorySet.delete(value);
      } else {
        categorySet.add(value);
      }
      
      newFilters[category] = categorySet;
      return newFilters;
    });
  };

  const toggleProjectSelection = (projectId) => {
    setSelectedProjects(prev => {
      const newSelection = new Set(prev);
      if (newSelection.has(projectId)) {
        newSelection.delete(projectId);
      } else {
        newSelection.add(projectId);
      }
      return newSelection;
    });
  };

  const addToPriorityList = () => {
    const selectedProjectsList = filteredData.filter(project => 
      selectedProjects.has(project.id));
    
    setPriorityList(prev => {
      const newList = [...prev];
      selectedProjectsList.forEach(project => {
        if (!newList.find(p => p.id === project.id)) {
          newList.push({ ...project, position: newList.length + 1 });
        }
      });
      return newList;
    });
    setSelectedProjects(new Set());
  };

  const updateProjectPosition = (projectId, newPosition) => {
    setPriorityList(prev => {
      const list = [...prev];
      const projectIndex = list.findIndex(p => p.id === projectId);
      const project = list[projectIndex];
      
      list.splice(projectIndex, 1);
      list.splice(newPosition - 1, 0, {
        ...project,
        position: newPosition
      });
      
      return list.map((p, index) => ({
        ...p,
        position: index + 1
      }));
    });
  };

  const moveProject = (projectId, direction) => {
    setPriorityList(prev => {
      const list = [...prev];
      const currentIndex = list.findIndex(p => p.id === projectId);
      const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
      
      if (newIndex >= 0 && newIndex < list.length) {
        const temp = list[currentIndex];
        list[currentIndex] = list[newIndex];
        list[newIndex] = temp;
        
        return list.map((p, index) => ({
          ...p,
          position: index + 1
        }));
      }
      
      return list;
    });
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    if (value && !activeFilters.includes(key)) {
      setActiveFilters(prev => [...prev, key]);
    } else if (!value) {
      setActiveFilters(prev => prev.filter(f => f !== key));
    }
  };

  const clearFilters = () => {
    setFilters({
      supervisor: '',
      department: '',
      field: '',
      eligibility: '',
      searchTerm: ''
    });
    setActiveFilters([]);
    setMultiFilters({
      supervisors: new Set(),
      departments: new Set(),
      fields: new Set(),
      eligibleDepts: new Set()
    });
  };

  const exportToExcel = () => {
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
  };

  const filteredData = useMemo(() => {
    return projectData.filter((project) => {
      const matchesSearch = filters.searchTerm ? 
        Object.values(project).some(value => 
          value.toString().toLowerCase().includes(filters.searchTerm.toLowerCase())
        ) : true;

      const matchesSupervisor = multiFilters.supervisors.size === 0 || 
        multiFilters.supervisors.has(project.supervisorName);

      const matchesDepartment = multiFilters.departments.size === 0 || 
        multiFilters.departments.has(project.department);

      const matchesField = multiFilters.fields.size === 0 || 
        multiFilters.fields.has(project.researchField);

      const matchesEligibility = multiFilters.eligibleDepts.size === 0 || 
        project.eligibleDepartments.some(dept => 
          multiFilters.eligibleDepts.has(dept));

      return matchesSearch && matchesSupervisor && matchesDepartment && 
             matchesField && matchesEligibility;
    });
  }, [filters, multiFilters]);

  const toggleRow = (index) => {
    const newExpandedRows = new Set(expandedRows);
    if (newExpandedRows.has(index)) {
      newExpandedRows.delete(index);
    } else {
      newExpandedRows.add(index);
    }
    setExpandedRows(newExpandedRows);
  };

  const PriorityListModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
      <div className="bg-white rounded-lg p-6 w-3/4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">Priority List</h2>
          <button
            onClick={() => setShowPriorityList(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="space-y-2">
          {priorityList.map((project) => (
            <div 
              key={project.id}
              className="flex items-center gap-4 p-2 bg-gray-50 rounded"
            >
              <GripVertical className="h-5 w-5 text-gray-400" />
              <span className="flex-1">{project.projectTitle}</span>
              <input
                type="number"
                min="1"
                max={priorityList.length}
                value={project.position}
                onChange={(e) => updateProjectPosition(project.id, parseInt(e.target.value))}
                className="w-16 p-1 border rounded"
              />
              <button
                onClick={() => moveProject(project.id, 'up')}
                disabled={project.position === 1}
                className="p-1 hover:bg-gray-200 rounded"
              >
                ↑
              </button>
              <button
                onClick={() => moveProject(project.id, 'down')}
                disabled={project.position === priorityList.length}
                className="p-1 hover:bg-gray-200 rounded"
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
    <div className="min-h-screen bg-gray-50 p-4">
      <header className="bg-white shadow-sm rounded-lg mb-6">
        <div className="max-w-7xl mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-2xl font-bold text-gray-900">Thesis Projects Comparison</h1>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPriorityList(true)}
                className="flex items-center px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600"
              >
                Priority List ({priorityList.length})
              </button>
              {selectedProjects.size > 0 && (
                <button
                  onClick={addToPriorityList}
                  className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
                >
                  Add to Priority ({selectedProjects.size})
                </button>
              )}
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="flex items-center px-4 py-2 bg-white border rounded-md shadow-sm hover:bg-gray-50"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </button>
              <button 
                onClick={exportToExcel}
                className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600"
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
              className="pl-10 w-full p-2 border rounded"
              value={filters.searchTerm}
              onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
            />
          </div>
        </div>
      </header>

      {activeFilters.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-2">
          {activeFilters.map(filter => (
            <span 
              key={filter}
              className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-blue-100 text-blue-800"
            >
              {filter}: {filters[filter]}
              <button
                onClick={() => handleFilterChange(filter, '')}
                className="ml-2"
              >
                <X className="h-4 w-4" />
              </button>
            </span>
          ))}
          <button
            onClick={clearFilters}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Clear all filters
          </button>
        </div>
      )}

      {showFilters && (
        <div className="mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 bg-white p-4 rounded-lg shadow-sm">
          {Object.entries(uniqueValues).map(([category, values]) => (
            <div key={category} className="space-y-2">
              <h3 className="font-medium">{category.charAt(0).toUpperCase() + category.slice(1)}</h3>
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

      <div className="bg-white rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3"></th>
                <th className="px-6 py-3"></th>
                <th className="px-6 py-3 text-left">Supervisor</th>
                <th className="px-6 py-3 text-left">Project Title</th>
                <th className="px-6 py-3 text-left">Research Field</th>
                <th className="px-6 py-3 text-left">Department</th>
                <th className="px-6 py-3 text-left">Eligibility</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredData.map((project, index) => (
                <React.Fragment key={index}>
                  <tr className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedProjects.has(project.id)}
                        onChange={() => toggleProjectSelection(project.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => toggleRow(index)}
                        className="text-gray-400 hover:text-gray-600"
                      >
                        {expandedRows.has(index) ? (
                          <ChevronUp className="h-5 w-5" />
                        ) : (
                          <ChevronDown className="h-5 w-5" />)}
                          </button>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">
                            {project.supervisorName}
                          </div>
                          <div className="text-sm text-gray-500">
                            {project.supervisorEmail}
                          </div>
                        </td>
                        <td className="px-6 py-4">{project.projectTitle}</td>
                        <td className="px-6 py-4">{project.researchField}</td>
                        <td className="px-6 py-4">{project.department}</td>
                        <td className="px-6 py-4">
                          {project.eligibleDepartments.includes(filters.eligibility) ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              Eligible
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                              Check Requirements
                            </span>
                          )}
                        </td>
                      </tr>
                      {expandedRows.has(index) && (
                        <tr>
                          <td colSpan="7" className="px-6 py-4 bg-gray-50">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <Card>
                                <CardContent>
                                  <h3 className="font-medium text-gray-900 mb-2">
                                    Project Description
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    {project.projectDescription}
                                  </p>
                                </CardContent>
                              </Card>
    
                              <Card>
                                <CardContent>
                                  <h3 className="font-medium text-gray-900 mb-2">
                                    Methodology
                                  </h3>
                                  <div className="text-sm text-gray-600">
                                    {project.projectMethodology.split('\n').map((step, i) => (
                                      <div key={i} className="flex items-start mb-2">
                                        <span className="mr-2">•</span>
                                        <span>{step}</span>
                                      </div>
                                    ))}
                                  </div>
                                </CardContent>
                              </Card>
    
                              <Card>
                                <CardContent>
                                  <h3 className="font-medium text-gray-900 mb-2">
                                    Qualifications & Requirements
                                  </h3>
                                  <p className="text-sm text-gray-600">
                                    {project.qualifications}
                                  </p>
                                </CardContent>
                              </Card>
    
                              <Card>
                                <CardContent>
                                  <h3 className="font-medium text-gray-900 mb-2">
                                    Eligible Departments
                                  </h3>
                                  <div className="flex flex-wrap gap-2">
                                    {project.eligibleDepartments.map((dept, i) => (
                                      <span
                                        key={i}
                                        className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                                      >
                                        {dept}
                                      </span>
                                    ))}
                                  </div>
                                  {project.furtherComments !== "N/A" && (
                                    <div className="mt-4">
                                      <h4 className="font-medium text-gray-900 mb-1">
                                        Additional Notes
                                      </h4>
                                      <p className="text-sm text-gray-600">
                                        {project.furtherComments}
                                      </p>
                                    </div>
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