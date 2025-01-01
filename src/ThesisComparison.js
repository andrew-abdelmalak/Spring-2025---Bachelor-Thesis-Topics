import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { Search, ChevronDown, Filter, X, Trash2 } from 'lucide-react';
import { projectData } from './Data'; // Assuming you're using Data.js
import * as XLSX from 'xlsx';
import { useDebounce } from 'use-debounce'; // Install this package: npm install use-debounce
import { motion, AnimatePresence } from 'framer-motion';

// Card components
const Card = React.memo(({ children, className = "" }) => (
    <div
        className={`p-6 shadow-sm rounded-xl transition-all 
            bg-white/90 border border-gray-200 hover:border-blue-400 ${className}`}
    >
        {children}
    </div>
));

const CardContent = React.memo(({ children }) => (
    <div className="space-y-4 text-gray-700">
        {children}
    </div>
));

const FilterDropdown = ({ label, options, selected, onChange }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef(null);

    // Add click outside handler
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    // Filter options based on the search term and only show non-zero counts
    const filteredOptions = useMemo(() => {
        if (!searchTerm.trim()) {
            return options.filter(([_, count]) => count > 0);
        }
        const lowerCaseSearchTerm = searchTerm.toLowerCase().trim();
        return options.filter(([value, count]) =>
            value.toLowerCase().includes(lowerCaseSearchTerm) && count > 0
        );
    }, [options, searchTerm]);

    // Handle search input changes
    const handleSearchChange = (e) => {
        setSearchTerm(e.target.value);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-full px-4 py-2 text-left rounded-lg flex justify-between items-center 
                    bg-white border border-gray-200 hover:border-gray-300"
            >
                <span className="truncate">
                    {selected.size > 0 ? `${label} (${selected.size})` : label}
                </span>
                <ChevronDown className="h-4 w-4 text-gray-500" />
            </button>

            {isOpen && (
                <div className="absolute z-[60] w-full mt-1 rounded-lg shadow-lg overflow-hidden 
                    bg-white border border-gray-200"
                    style={{
                        maxWidth: "100%",
                        transform: "none",
                        left: 0,
                        top: "100%"
                    }}
                >
                    <div className="px-2 py-1">
                        <input
                            type="text"
                            placeholder={`Search ${label}...`}
                            value={searchTerm}
                            onChange={handleSearchChange}
                            autoFocus // Automatically focus the search input when dropdown opens
                            className="w-full px-2 py-1 rounded-md text-sm bg-gray-100 
                                text-gray-900 placeholder-gray-500"
                        />
                    </div>

                    <div className="max-h-60 overflow-y-auto">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map(([value, count]) => (
                                <label
                                    key={value}
                                    className="flex items-center px-4 py-2 cursor-pointer hover:bg-gray-50"
                                >
                                    <input
                                        type="checkbox"
                                        checked={selected.has(value)}
                                        onChange={() => onChange(value)}
                                        className="rounded mr-3"
                                    />
                                    <span className="flex-1">{value}</span>
                                    <span className="text-sm text-gray-500">({count})</span>
                                </label>
                            ))
                        ) : (
                            <div className="px-4 py-2 text-sm text-gray-500">
                                No matching options available
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// HighlightedText component 
const HighlightedText = React.memo(({ text = "", searchTerm = "" }) => {
    if (!searchTerm || typeof text !== 'string') return <>{text}</>;

    const parts = [];
    let lastIndex = 0;
    let index = text.toLowerCase().indexOf(searchTerm.toLowerCase());

    while (index !== -1) {
        parts.push(text.slice(lastIndex, index));
        parts.push(
            <span className="bg-yellow-50/90 text-yellow-700 rounded px-1">
                {text.slice(index, index + searchTerm.length)}
            </span>,
        );
        lastIndex = index + searchTerm.length;
        index = text.toLowerCase().indexOf(searchTerm.toLowerCase(), lastIndex);
    }

    parts.push(text.slice(lastIndex));

    return <>{parts}</>;
});

// ConfirmationModal component
const ConfirmationModal = React.memo(({
    isOpen,
    onClose,
    onConfirm,
    message,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel",
}) => {
    useModalClose(isOpen, onClose);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 flex items-center justify-center"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="rounded-xl p-6 w-full max-w-md mx-4 bg-white">
                <h3 className="text-xl font-medium mb-4 text-gray-900">{message}</h3>
                <div className="flex justify-end gap-4">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-base rounded-lg bg-gray-100 hover:bg-gray-200 
                            text-gray-700 font-medium"
                    >
                        {cancelLabel}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-6 py-2.5 text-base text-white rounded-lg bg-red-500 
                            hover:bg-red-600 transition-colors font-medium"
                    >
                        {confirmLabel}
                    </button>
                </div>
            </div>
        </div>
    );
});

const SortableHeader = React.memo(({ title, sortKey, sortConfig, handleSort }) => {
    const isSorted = sortConfig.key === sortKey;
    const getTooltipDescription = () => {
        if (!isSorted) return "Click to sort ascending";
        if (sortConfig.direction === 'asc') return "Click to sort descending";
        return "Click to remove sorting";
    };

    return (
        <th
            className="px-6 py-4 text-left cursor-pointer select-none 
                hover:bg-gray-50/90 text-gray-700 font-medium text-base"
            onClick={() => handleSort(sortKey)}
        >
            <Tooltip
                text={`Sort by ${title}`}
                description={getTooltipDescription()}
            >
                <div className="flex items-center gap-2">
                    {title}
                    {isSorted && (
                        <span className="text-base">
                            {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                    )}
                </div>
            </Tooltip>
        </th>
    );
});

export const ProjectDetailsPopup = React.memo(({ project, onClose }) => {
    useModalClose(true, onClose);

    if (!project) return null;

    return (
        <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60"
            onClick={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >
            <div className="relative w-full max-w-4xl mx-4 rounded-lg shadow-xl overflow-y-auto max-h-[90vh] bg-white">
                <div className="p-6 relative">
                    <h2 className="text-2xl font-bold mb-4 pr-12">
                        {project.projectTitle}
                    </h2>
                    <button
                        onClick={onClose}
                        className="absolute right-4 top-4 p-2 rounded-lg transition-colors hover:bg-gray-100 z-10"
                    >
                        <X className="h-5 w-5" />
                    </button>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Card className="">
                            <CardContent>
                                <h3 className={`font-medium mb-2 text-gray-900`}>
                                    Supervisor Information
                                </h3>
                                <div className={`text-sm text-gray-600`}>
                                    <p><strong>Supervisor:</strong> {project.supervisorName}</p>
                                    <p><strong>Email:</strong> {project.supervisorEmail}</p>
                                    {project.coSupervisor && (
                                        <>
                                            <p className="mt-2"><strong>Co-Supervisor:</strong> {project.coSupervisor}</p>
                                            <p><strong>Email:</strong> {project.coSupervisorEmail}</p>
                                        </>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="">
                            <CardContent>
                                <h3 className={`font-medium mb-2 text-gray-900`}>
                                    Department & Field
                                </h3>
                                <div className={`text-sm text-gray-600`}>
                                    <p><strong>Department:</strong> {project.department}</p>
                                    <p><strong>Research Field:</strong> {project.researchField}</p>
                                    <div className="mt-2">
                                        <strong>Eligible Departments:</strong>
                                        <div className="flex flex-wrap gap-1 mt-1">
                                            {(project.eligibleDepartments || []).map((dept) => (
                                                <span
                                                    key={dept}
                                                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                            bg-emerald-50/90 text-emerald-700`}
                                                >
                                                    {dept}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card className="md:col-span-2">
                            <CardContent>
                                <h3 className={`font-medium mb-2 text-gray-900`}>
                                    Project Description
                                </h3>
                                <p className={`text-sm text-gray-600`}>
                                    {project.projectDescription}
                                </p>
                            </CardContent>
                        </Card>

                        {project.projectMethodology && (
                            <Card className="md:col-span-2">
                                <CardContent>
                                    <h3 className={`font-medium mb-2 text-gray-900`}>
                                        Project Methodology
                                    </h3>
                                    <div className={`text-sm text-gray-600 whitespace-pre-line`}>
                                        {Array.isArray(project.projectMethodology) ? (
                                            project.projectMethodology.join('\n')
                                        ) : (
                                            project.projectMethodology
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {project.qualifications && (
                            <Card className="md:col-span-2">
                                <CardContent>
                                    <h3 className={`font-medium mb-2 text-gray-900`}>
                                        Required Qualifications
                                    </h3>
                                    <div className={`text-sm text-gray-600 whitespace-pre-line`}>
                                        {Array.isArray(project.qualifications) ? (
                                            project.qualifications.join('\n')
                                        ) : (
                                            project.qualifications
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {project.furtherComments && (
                            <Card className="md:col-span-2">
                                <CardContent>
                                    <h3 className={`font-medium mb-2 text-gray-900`}>
                                        Additional Comments
                                    </h3>
                                    <p className={`text-sm text-gray-600`}>
                                        {project.furtherComments}
                                    </p>
                                </CardContent>
                            </Card>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
});

const PriorityListModal = ({
    priorityList,
    setPriorityList,
    setShowPriorityList,
    setShowClearConfirmation,
    exportToExcel,
    setSelectedProjects,
    setToast
}) => {
    useModalClose(true, () => setShowPriorityList(false));

    const [draggingIndex, setDraggingIndex] = useState(null);
    const dragProject = useRef(null);
    const draggedOverProject = useRef(null);

    // Simple drag and drop sorting - no position tracking needed
    const handleSort = useCallback(() => {
        if (dragProject.current === null || draggedOverProject.current === null) return;

        setPriorityList(prevList => {
            const newList = [...prevList];
            const draggedItem = newList[dragProject.current];

            // Remove the dragged item
            newList.splice(dragProject.current, 1);
            // Insert it at the new position
            newList.splice(draggedOverProject.current, 0, draggedItem);

            return newList;
        });

        // Reset drag refs
        dragProject.current = null;
        draggedOverProject.current = null;
        setDraggingIndex(null);
    }, [setPriorityList]);

    // Remove from priority list
    const removeFromPriorityList = useCallback((projectTitle) => {
        setPriorityList(prev => prev.filter(p => p.projectTitle !== projectTitle));
        setSelectedProjects(prev => {
            const newSet = new Set(prev);
            newSet.delete(projectTitle);
            return newSet;
        });
    }, [setPriorityList, setSelectedProjects]);

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={(e) => {
                if (e.target === e.currentTarget) setShowPriorityList(false);
            }}
        >
            <div className="rounded-xl w-full md:w-4/5 lg:w-3/4 m-4 
                bg-white/90 backdrop-blur-lg border border-gray-200 flex flex-col max-h-[85vh]">
                {/* Header section */}
                <div className="sticky top-0 z-10 bg-white/90 backdrop-blur-lg border-b border-gray-200">
                    <div className="flex justify-between items-center p-4">
                        <h2 className="text-2xl font-bold text-gray-900">
                            Priority List ({priorityList.length})
                        </h2>
                        <div className="flex gap-3">
                            <button
                                onClick={() => exportToExcel(priorityList, 'priority_list.xlsx')}
                                className="px-6 py-2.5 text-base bg-purple-500 text-white rounded-lg hover:bg-purple-600"
                            >
                                Export List
                            </button>
                            <button
                                onClick={() => setShowClearConfirmation(true)}
                                className="px-6 py-2.5 text-base bg-red-500 text-white rounded-lg hover:bg-red-600"
                            >
                                Clear List
                            </button>
                            <button
                                onClick={() => setShowPriorityList(false)}
                                className="p-2.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* List content */}
                <div className="overflow-y-auto flex-1 p-3 space-y-2">
                    {/* Create fixed cells with numbers first */}
                    {Array.from({ length: priorityList.length }, (_, index) => (
                        <div
                            key={`cell-${index + 1}`}
                            className="relative"
                        >
                            {/* Fixed number cell */}
                            <div className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center 
                                border-r border-gray-200 bg-gray-50 rounded-l-lg select-none">
                                <span className="font-medium text-gray-500">
                                    {index + 1}
                                </span>
                            </div>

                            {/* Draggable project content */}
                            <div
                                draggable
                                onDragStart={() => {
                                    dragProject.current = index;
                                    setDraggingIndex(index);
                                }}
                                onDragEnter={() => {
                                    draggedOverProject.current = index;
                                }}
                                onDragEnd={handleSort}
                                onDragOver={(e) => e.preventDefault()}
                                className={`flex items-center gap-2 p-2.5 rounded-lg 
                                    ${draggingIndex === index ? 'bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'} 
                                    border border-gray-200 transition-colors duration-200 cursor-move`}
                            >
                                {/* Spacer to account for fixed number width */}
                                <div className="w-12" />

                                {/* Project Details */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="font-medium text-gray-900 truncate">
                                            {priorityList[index]?.projectTitle}
                                        </div>
                                    </div>
                                    <div className="text-sm text-gray-500 truncate">
                                        {priorityList[index]?.supervisorName}
                                        {priorityList[index]?.coSupervisor &&
                                            `, ${priorityList[index]?.coSupervisor}`}
                                    </div>
                                </div>

                                <button
                                    onClick={() => removeFromPriorityList(priorityList[index]?.projectTitle)}
                                    className="p-2 rounded-lg text-red-500 hover:bg-red-50 
                                        transition-colors"
                                >
                                    <Trash2 className="h-5 w-5" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Add a new Toast component
const Toast = React.memo(({ message, type = 'success', onClose }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onClose();
        }, 3000); // Disappear after 3 seconds

        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={`fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 
                ${type === 'success' ? 'bg-green-500' : 'bg-red-500'} text-white`}
        >
            {message}
        </motion.div>
    );
});

// Add this new component near the top with other component definitions
const Tooltip = React.memo(({ text, description, children, position = 'bottom' }) => {
    const [isVisible, setIsVisible] = useState(false);
    const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
    const triggerRef = useRef(null);
    const tooltipRef = useRef(null);

    const updatePosition = useCallback(() => {
        if (triggerRef.current && tooltipRef.current) {
            const triggerRect = triggerRef.current.getBoundingClientRect();
            const tooltipRect = tooltipRef.current.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const viewportHeight = window.innerHeight;

            // Calculate base position
            let x = triggerRect.left + (triggerRect.width / 2);
            let y;

            // Position based on specified preference
            if (position === 'bottom') {
                y = triggerRect.bottom + 8; // Add some spacing
                // Check if tooltip would go below viewport
                if (y + tooltipRect.height > viewportHeight) {
                    y = triggerRect.top - tooltipRect.height - 8;
                }
            } else {
                y = triggerRect.top - tooltipRect.height - 8;
                // Check if tooltip would go above viewport
                if (y < 0) {
                    y = triggerRect.bottom + 8;
                }
            }

            // Adjust horizontal position if tooltip would overflow viewport
            if (x + (tooltipRect.width / 2) > viewportWidth) {
                x = viewportWidth - tooltipRect.width - 10;
            } else if (x - (tooltipRect.width / 2) < 0) {
                x = tooltipRect.width / 2 + 10;
            }

            setTooltipPosition({ x, y });
        }
    }, [position]);

    useEffect(() => {
        if (isVisible) {
            updatePosition();
            window.addEventListener('scroll', updatePosition);
            window.addEventListener('resize', updatePosition);
        }
        return () => {
            window.removeEventListener('scroll', updatePosition);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isVisible, updatePosition]);

    return (
        <>
            <div
                ref={triggerRef}
                onMouseEnter={() => setIsVisible(true)}
                onMouseLeave={() => setIsVisible(false)}
            >
                {children}
            </div>
            {isVisible && ReactDOM.createPortal(
                <div
                    ref={tooltipRef}
                    style={{
                        position: 'fixed',
                        left: tooltipPosition.x,
                        top: tooltipPosition.y,
                        transform: 'translateX(-50%)',
                        zIndex: 999999
                    }}
                    className="pointer-events-none"
                >
                    <div className="relative px-4 py-2 rounded-lg shadow-lg bg-gray-900 text-white text-sm whitespace-nowrap">
                        <div className="font-medium mb-1">{text}</div>
                        {description && (
                            <div className="text-gray-300 text-xs max-w-xs whitespace-normal">
                                {description}
                            </div>
                        )}
                        <div
                            className={`absolute left-1/2 -translate-x-1/2 border-4 border-transparent
                                ${position === 'bottom' ? 'top-0 -mt-1 border-b-gray-900 rotate-180' : 'bottom-0 -mb-1 border-t-gray-900'}`}
                        />
                    </div>
                </div>,
                document.body
            )}
        </>
    );
});

// Add this near the top of the file with other hooks
const useModalClose = (isOpen, onClose) => {
    useEffect(() => {
        if (!isOpen) return;

        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }
        };

        const handleClickOutside = (e) => {
            if (e.target === e.currentTarget) {
                e.preventDefault();
                e.stopPropagation();
                onClose();
            }
        };

        document.addEventListener('keydown', handleEscape);
        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('keydown', handleEscape);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen, onClose]);
};

export default function ThesisComparisonSystem() {
    // Load initial states from localStorage with proper Set conversion
    const initialStates = useMemo(() => {
        try {
            const savedFilters = JSON.parse(localStorage.getItem('filters')) || {
                supervisors: [],
                departments: [],
                fields: [],
                eligibleDepts: [],
                searchTerm: ''
            };

            // Convert arrays to Sets and load selectedProjects
            return {
                filters: {
                    supervisors: new Set(savedFilters.supervisors),
                    departments: new Set(savedFilters.departments),
                    fields: new Set(savedFilters.fields),
                    eligibleDepts: new Set(savedFilters.eligibleDepts),
                    searchTerm: savedFilters.searchTerm
                },
                expandedRows: new Set(JSON.parse(localStorage.getItem('expandedRows')) || []),
                sortConfig: JSON.parse(localStorage.getItem('sortConfig')) || { key: null, direction: null },
                scrollPosition: parseInt(localStorage.getItem('scrollPosition')) || 0,
                showFilters: localStorage.getItem('showFilters') === 'true',
                // Add selectedProjects to initial states
                selectedProjects: new Set(JSON.parse(localStorage.getItem('selectedProjects')) || [])
            };
        } catch (error) {
            console.error('Error loading saved states:', error);
            return {
                filters: {
                    supervisors: new Set(),
                    departments: new Set(),
                    fields: new Set(),
                    eligibleDepts: new Set(),
                    searchTerm: ''
                },
                expandedRows: new Set(),
                sortConfig: { key: null, direction: null },
                scrollPosition: 0,
                showFilters: false,
                selectedProjects: new Set()
            };
        }
    }, []);

    // Initialize states with saved values
    const [multiFilters, setMultiFilters] = useState(initialStates.filters);
    const [expandedRows, setExpandedRows] = useState(initialStates.expandedRows);
    const [sortConfig, setSortConfig] = useState(initialStates.sortConfig);
    const [showFilters, setShowFilters] = useState(initialStates.showFilters);

    // Reference for the table container
    const tableContainerRef = useRef(null);

    // Save states with proper Set conversion
    useEffect(() => {
        try {
            // Convert Sets to arrays for storage
            const filtersForStorage = {
                supervisors: Array.from(multiFilters.supervisors),
                departments: Array.from(multiFilters.departments),
                fields: Array.from(multiFilters.fields),
                eligibleDepts: Array.from(multiFilters.eligibleDepts),
                searchTerm: multiFilters.searchTerm
            };

            localStorage.setItem('filters', JSON.stringify(filtersForStorage));
            localStorage.setItem('expandedRows', JSON.stringify(Array.from(expandedRows)));
            localStorage.setItem('sortConfig', JSON.stringify(sortConfig));
            localStorage.setItem('showFilters', showFilters.toString());
        } catch (error) {
            console.error('Error saving states:', error);
        }
    }, [multiFilters, expandedRows, sortConfig, showFilters]);

    // Save scroll position when scrolling
    useEffect(() => {
        const container = tableContainerRef.current;
        if (!container) return;

        // Debounced scroll handler to avoid too frequent updates
        let timeoutId;
        const handleScroll = () => {
            clearTimeout(timeoutId);
            timeoutId = setTimeout(() => {
                localStorage.setItem('scrollPosition', container.scrollTop.toString());
            }, 100); // Debounce time of 100ms
        };

        container.addEventListener('scroll', handleScroll);

        // Restore scroll position after a short delay to ensure content is loaded
        const restoreScrollTimeout = setTimeout(() => {
            const savedScrollPosition = parseInt(localStorage.getItem('scrollPosition')) || 0;
            container.scrollTop = savedScrollPosition;
        }, 100);

        return () => {
            container.removeEventListener('scroll', handleScroll);
            clearTimeout(timeoutId);
            clearTimeout(restoreScrollTimeout);
        };
    }, []);

    // Add cleanup when component unmounts
    useEffect(() => {
        // Store ref in a variable that will be captured in the closure
        const containerRef = tableContainerRef.current;

        return () => {
            // Use the captured ref value in cleanup
            if (containerRef) {
                localStorage.setItem('scrollPosition', containerRef.scrollTop.toString());
            }
        };
    }, []);

    const [selectedProjects, setSelectedProjects] = useState(initialStates.selectedProjects);
    const [priorityList, setPriorityList] = useState([]);
    const [showPriorityList, setShowPriorityList] = useState(false);
    const [showClearConfirmation, setShowClearConfirmation] = useState(false);
    const [showWhatsAppConfirmation, setShowWhatsAppConfirmation] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const [debouncedSearchTerm] = useDebounce(multiFilters.searchTerm, 300);

    const [toast, setToast] = useState(null);

    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 1024);
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    }, []);

    useEffect(() => {
        const savedPriorityList = localStorage.getItem('priorityList');
        if (savedPriorityList) {
            try {
                setPriorityList(JSON.parse(savedPriorityList));
            } catch (error) {
                console.error('Error loading priority list:', error);
                // Display error to user
                alert('Error loading priority list. Please try again.');
                setPriorityList([]);
            }
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem('priorityList', JSON.stringify(priorityList));
        } catch (error) {
            console.error('Error saving priority list:', error);
            // Display error to user
            alert('Error saving priority list. Please try again.');
        }
    }, [priorityList]);

    // Add useEffect to save selectedProjects
    useEffect(() => {
        try {
            localStorage.setItem('selectedProjects', JSON.stringify(Array.from(selectedProjects)));
        } catch (error) {
            console.error('Error saving selected projects:', error);
        }
    }, [selectedProjects]);

    const handleSort = useCallback((key) => {
        setSortConfig((prev) => {
            if (prev.key === key) {
                // Cycle through: asc -> desc -> null
                if (prev.direction === 'asc') {
                    return { key, direction: 'desc' };
                } else if (prev.direction === 'desc') {
                    return { key: null, direction: null };
                }
            }
            // Default to ascending when first clicking
            return { key, direction: 'asc' };
        });
    }, []);

    // No more N/A replacement needed
    const processedData = useMemo(() => {
        return projectData;
    }, []);

    // Updated filtering logic
    const filteredAndSortedData = useMemo(() => {
        let result = processedData.filter((project) => {
            const matchesSearch = !multiFilters.searchTerm ||
                Object.values(project).some(value =>
                    String(value).toLowerCase().includes(multiFilters.searchTerm.toLowerCase())
                );

            const matchesSupervisor = multiFilters.supervisors.size === 0 ||
                multiFilters.supervisors.has(project.supervisorName) ||
                (project.coSupervisor && multiFilters.supervisors.has(project.coSupervisor));

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
                return sortConfig.direction === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
            });
        }

        return result;
    }, [multiFilters, sortConfig, processedData]);

    // Update the uniqueValues calculation to consider current filters
    const uniqueValues = useMemo(() => {
        // Helper function to check if an item passes current filters
        const passesCurrentFilters = (item, excludeCategory = null) => {
            if (excludeCategory !== 'supervisors' &&
                multiFilters.supervisors.size > 0 &&
                !multiFilters.supervisors.has(item.supervisorName) &&
                !multiFilters.supervisors.has(item.coSupervisor)) {
                return false;
            }

            if (excludeCategory !== 'departments' &&
                multiFilters.departments.size > 0 &&
                !multiFilters.departments.has(item.department)) {
                return false;
            }

            if (excludeCategory !== 'fields' &&
                multiFilters.fields.size > 0 &&
                !multiFilters.fields.has(item.researchField)) {
                return false;
            }

            if (excludeCategory !== 'eligibleDepts' &&
                multiFilters.eligibleDepts.size > 0 &&
                !item.eligibleDepartments?.some(dept => multiFilters.eligibleDepts.has(dept))) {
                return false;
            }

            return true;
        };

        // Function to get filtered counts for each category
        const getFilteredCounts = (field, excludeCategory = null) => {
            const counts = new Map();
            const allValues = new Map(); // Changed to Map to store lowercase keys with original values

            // First pass: collect all possible values
            processedData.forEach(item => {
                if (field === 'supervisorName') {
                    [item.supervisorName, item.coSupervisor].forEach(value => {
                        if (value) {
                            const lowerValue = value.trim().toLowerCase();
                            if (!allValues.has(lowerValue)) {
                                allValues.set(lowerValue, value.trim());
                            }
                        }
                    });
                } else if (field === 'eligibleDepartments') {
                    (item[field] || []).forEach(value => {
                        const lowerValue = value.toLowerCase();
                        if (!allValues.has(lowerValue)) {
                            allValues.set(lowerValue, value);
                        }
                    });
                } else if (item[field]) {
                    const lowerValue = item[field].toLowerCase();
                    if (!allValues.has(lowerValue)) {
                        allValues.set(lowerValue, item[field]);
                    }
                }
            });

            // Second pass: count occurrences considering filters
            allValues.forEach((originalValue, lowerValue) => {
                let count = 0;
                processedData.forEach(item => {
                    if (!passesCurrentFilters(item, excludeCategory)) return;

                    if (field === 'supervisorName') {
                        if (item.supervisorName?.toLowerCase() === lowerValue ||
                            item.coSupervisor?.toLowerCase() === lowerValue) count++;
                    } else if (field === 'eligibleDepartments') {
                        if (item[field]?.some(dept => dept.toLowerCase() === lowerValue)) count++;
                    } else {
                        if (item[field]?.toLowerCase() === lowerValue) count++;
                    }
                });
                counts.set(originalValue, count);
            });

            return Array.from(counts.entries())
                .sort((a, b) => b[1] - a[1]); // Sort by count descending
        };

        return {
            supervisors: getFilteredCounts('supervisorName', 'supervisors'),
            departments: getFilteredCounts('department', 'departments'),
            fields: getFilteredCounts('researchField', 'fields'),
            eligibleDepts: getFilteredCounts('eligibleDepartments', 'eligibleDepts')
        };
    }, [multiFilters, processedData]);

    const exportToExcel = async (data, filename) => {
        try {
            setIsLoading(true);

            // Transform data with minimal formatting
            const formattedData = data.map(project => ({
                'Supervisor Name': project.supervisorName || '',
                'Co-Supervisor': project.coSupervisor || '',
                'Supervisor Email': project.supervisorEmail || '',
                'Co-Supervisor Email': project.coSupervisorEmail || '',
                'Department': project.department || '',
                'Project Title': project.projectTitle || '',
                'Research Field': project.researchField || '',
                'Project Description': project.projectDescription || '',
                'Project Methodology': Array.isArray(project.projectMethodology)
                    ? project.projectMethodology.join(', ') : project.projectMethodology || '',
                'Qualifications': Array.isArray(project.qualifications)
                    ? project.qualifications.join(', ') : project.qualifications || '',
                'Further Comments': project.furtherComments || '',
                'Eligible Departments': (project.eligibleDepartments || []).join(', ')
            }));

            // Create worksheet
            const ws = XLSX.utils.json_to_sheet(formattedData, {
                cellStyles: true
            });

            // Simple column width calculation
            const calculateColWidths = (data) => {
                const colWidths = {};
                const headers = Object.keys(data[0]);

                // Initialize with header lengths
                headers.forEach((header, idx) => {
                    colWidths[idx] = Math.min(header.length, 30); // Start with header width, max 30
                });

                // Check content lengths
                data.forEach(row => {
                    Object.values(row).forEach((cell, idx) => {
                        const cellLength = String(cell || '').length;
                        colWidths[idx] = Math.min(
                            Math.max(colWidths[idx], Math.ceil(cellLength * 0.8)), // Use 80% of content length
                            30 // Hard max at 30 characters
                        );
                    });
                });

                return colWidths;
            };

            // Apply column widths
            const colWidths = calculateColWidths(formattedData);
            ws['!cols'] = Object.values(colWidths).map(width => ({
                wch: Math.max(width, 6) // Minimum 6 characters
            }));

            // Set row heights
            const defaultHeight = { hpt: 25 }; // Default height 25 points
            ws['!rows'] = Array(formattedData.length + 1).fill(defaultHeight);

            // Basic cell styling
            const range = XLSX.utils.decode_range(ws['!ref']);
            for (let R = range.s.r; R <= range.e.r; ++R) {
                for (let C = range.s.c; C <= range.e.c; ++C) {
                    const cellRef = XLSX.utils.encode_cell({ c: C, r: R });
                    if (!ws[cellRef]) continue;

                    // Basic cell properties
                    ws[cellRef].s = {
                        alignment: {
                            vertical: 'center',
                            horizontal: 'left',
                            wrapText: true
                        },
                        border: {
                            top: { style: 'thin' },
                            bottom: { style: 'thin' },
                            left: { style: 'thin' },
                            right: { style: 'thin' }
                        },
                        font: {
                            name: 'Arial',
                            sz: 10
                        }
                    };

                    // Header row styling
                    if (R === 0) {
                        ws[cellRef].s.font.bold = true;
                        ws[cellRef].s.fill = {
                            patternType: 'solid',
                            fgColor: { rgb: 'EEEEEE' }
                        };
                    }
                }
            }

            // Create workbook and add the worksheet
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Projects');

            // Write file
            XLSX.writeFile(wb, filename);
            setToast({ message: 'Export successful!', type: 'success' });
        } catch (error) {
            console.error('Export failed:', error);
            setToast({ message: 'Export failed. Please try again.', type: 'error' });
        } finally {
            setIsLoading(false);
        }
    };

    const handleMultiFilterChange = useCallback((category, value) => {
        setMultiFilters((prev) => {
            const newFilters = { ...prev };
            const categorySet = new Set(prev[category]);
            categorySet.has(value) ? categorySet.delete(value) : categorySet.add(value);
            newFilters[category] = categorySet;
            return newFilters;
        });
        // Reset expanded rows whenever filters change
        setExpandedRows(new Set());
    }, []);

    const clearFilters = useCallback(() => {
        setMultiFilters({
            supervisors: new Set(),
            departments: new Set(),
            fields: new Set(),
            eligibleDepts: new Set(),
            searchTerm: ''
        });
        // Reset expanded rows when filters are cleared
        setExpandedRows(new Set());
    }, []);
    const clearPriorityList = useCallback(() => {
        setPriorityList([]);
        setSelectedProjects(new Set());
        setPendingChanges([]);
        setShowClearConfirmation(false);
        setToast({ message: 'Priority list cleared!', type: 'success' });
    }, [setPriorityList, setSelectedProjects, setToast]);

    const handleWhatsAppHelp = useCallback(() => {
        const message = encodeURIComponent('Samooo 3lekooo El Tlaga Feha Maya 2al-Ana G3an Awee');
        window.open(`https://wa.me/201286735310?text=${message}`);
        setShowWhatsAppConfirmation(false);
    }, []);

    // Add new state for tracking changes
    const [pendingChanges, setPendingChanges] = useState([]);

    // Update selection handler
    const handleProjectSelection = useCallback((projectTitle) => {
        setSelectedProjects(prev => {
            const newSet = new Set(prev);
            if (prev.has(projectTitle)) {
                newSet.delete(projectTitle);
            } else {
                newSet.add(projectTitle);
            }
            return newSet;
        });

        // Track both additions and removals in pendingChanges
        setPendingChanges(prev => {
            const project = filteredAndSortedData.find(p => p.projectTitle === projectTitle);
            const isInPriority = priorityList.some(p => p.projectTitle === projectTitle);

            if (selectedProjects.has(projectTitle)) {
                // If unchecking and project is in priority list, add a remove change
                if (isInPriority) {
                    return [...prev.filter(change => change.project.projectTitle !== projectTitle),
                    { type: 'remove', project }];
                }
                // If unchecking and project wasn't going to be added, remove any pending change
                return prev.filter(change => change.project.projectTitle !== projectTitle);
            } else {
                // If checking and project isn't in priority list, add an add change
                if (!isInPriority) {
                    return [...prev.filter(change => change.project.projectTitle !== projectTitle),
                    { type: 'add', project }];
                }
                // If checking and project is already in priority list, remove any pending change
                return prev.filter(change => change.project.projectTitle !== projectTitle);
            }
        });
    }, [filteredAndSortedData, priorityList, selectedProjects]);

    // Update priority list handler
    const handleUpdatePriority = useCallback(() => {
        setPriorityList(prev => {
            let newList = [...prev];

            // Handle removals first
            pendingChanges.forEach(change => {
                if (change.type === 'remove') {
                    newList = newList.filter(p => p.projectTitle !== change.project.projectTitle);
                }
            });

            // Then handle additions
            pendingChanges.forEach(change => {
                if (change.type === 'add') {
                    newList.push(change.project);
                }
            });

            // Recalculate positions for all items
            return newList.map((project, index) => ({
                ...project,
                position: index + 1 // Position is 1-based
            }));
        });

        setPendingChanges([]);
    }, [pendingChanges]);

    // Move "Clear All Filters" to header
    const FiltersHeader = ({ clearFilters }) => {
        // Get active filter count with detailed breakdown
        const getActiveFilterCount = () => {
            const { searchTerm, supervisors, departments, fields, eligibleDepts } = multiFilters;

            // Create an object to store counts for each filter type
            const filterCounts = {
                search: searchTerm.trim() ? 1 : 0,
                supervisors: supervisors.size,
                departments: departments.size,
                fields: fields.size,
                eligibleDepts: eligibleDepts.size
            };

            // Calculate total count
            const totalCount = Object.values(filterCounts).reduce((a, b) => a + b, 0);

            return {
                total: totalCount,
                breakdown: filterCounts
            };
        };

        const filterStats = getActiveFilterCount();
        const hasActiveFilters = filterStats.total > 0;

        return (
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-medium text-gray-700">
                    Filters
                    {hasActiveFilters && (
                        <span className="ml-2 text-sm text-gray-500">
                            (
                            {filterStats.breakdown.search > 0 && `Search: ${filterStats.breakdown.search}`}
                            {filterStats.breakdown.supervisors > 0 &&
                                `${filterStats.breakdown.search ? ', ' : ''}Supervisors: ${filterStats.breakdown.supervisors}`}
                            {filterStats.breakdown.departments > 0 &&
                                `${(filterStats.breakdown.search || filterStats.breakdown.supervisors) ? ', ' : ''}Departments: ${filterStats.breakdown.departments}`}
                            {filterStats.breakdown.fields > 0 &&
                                `${(filterStats.breakdown.search || filterStats.breakdown.supervisors || filterStats.breakdown.departments) ? ', ' : ''}Fields: ${filterStats.breakdown.fields}`}
                            {filterStats.breakdown.eligibleDepts > 0 &&
                                `${(filterStats.breakdown.search || filterStats.breakdown.supervisors || filterStats.breakdown.departments || filterStats.breakdown.fields) ? ', ' : ''}Eligible: ${filterStats.breakdown.eligibleDepts}`}
                            )
                        </span>
                    )}
                </h2>
                <div className="flex items-center gap-4">
                    <button
                        onClick={clearFilters}
                        disabled={!hasActiveFilters}
                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${hasActiveFilters
                            ? 'text-red-600 hover:text-red-700 hover:bg-red-50'
                            : 'text-gray-400 cursor-not-allowed'
                            }`}
                    >
                        Clear All {hasActiveFilters && `(${filterStats.total})`}
                    </button>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center px-4 py-2 rounded-lg shadow-sm transition-all 
                            bg-white/90 border hover:bg-gray-50/90"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            </div>
        );
    };

    // Update Header component with improved layout
    const Header = ({
        filteredAndSortedData,
        exportToExcel,
        setShowPriorityList,
        handleUpdatePriority,
        pendingChanges,
        clearFilters,
        multiFilters,
        setMultiFilters,
        setShowFilters,
        showFilters,
        setShowWhatsAppConfirmation,
        priorityList
    }) => {
        const [searchInput, setSearchInput] = useState(multiFilters.searchTerm);

        // Calculate active filters and counts
        const { hasActiveFilters, filterCounts } = useMemo(() => {
            const { searchTerm, supervisors, departments, fields, eligibleDepts } = multiFilters;

            const counts = {
                search: searchTerm.trim() ? 1 : 0,
                supervisors: supervisors.size,
                departments: departments.size,
                fields: fields.size,
                eligibleDepts: eligibleDepts.size
            };

            const total = Object.values(counts).reduce((a, b) => a + b, 0);

            return {
                hasActiveFilters: total > 0,
                filterCounts: {
                    total,
                    ...counts
                }
            };
        }, [multiFilters]);

        const applySearch = useCallback(() => {
            setMultiFilters(prev => ({ ...prev, searchTerm: searchInput }));
        }, [searchInput, setMultiFilters]);

        const handleSearchButton = useCallback(() => {
            if (multiFilters.searchTerm || hasActiveFilters) {
                // Clear both search and filters
                setSearchInput('');
                setMultiFilters({
                    supervisors: new Set(),
                    departments: new Set(),
                    fields: new Set(),
                    eligibleDepts: new Set(),
                    searchTerm: ''
                });
            }
        }, [multiFilters.searchTerm, hasActiveFilters, setMultiFilters]);

        const handleSearchChange = useCallback((e) => {
            setSearchInput(e.target.value);
        }, []);

        const handleKeyPress = useCallback((e) => {
            if (e.key === 'Enter') {
                applySearch();
            }
        }, [applySearch]);

        return (
            <header className="sticky top-0 z-30 shadow-lg rounded-xl mb-6 mx-2 bg-white/90 border border-gray-200 backdrop-blur-lg">
                <div className="px-6 py-4">
                    <div className="flex items-center gap-6">
                        {/* Stats section - fixed width */}
                        <div className="flex items-center space-x-4 text-sm text-gray-500 min-w-[200px]">
                            <span>Projects: {filteredAndSortedData.length}</span>
                            <span>•</span>
                            <span>Last Updated: 12/29/2024</span>
                        </div>

                        {/* Search section - flexible width */}
                        <div className="flex items-center gap-4 flex-1 max-w-2xl">
                            <div className="relative flex-1">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search projects..."
                                    className="pl-10 w-full py-2.5 px-4 text-base rounded-lg border focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                                    value={searchInput}
                                    onChange={handleSearchChange}
                                    onKeyDown={handleKeyPress}
                                />
                            </div>
                            {(multiFilters.searchTerm || hasActiveFilters) && (
                                <Tooltip
                                    text="Clear All"
                                    description="Clear all search terms and filters"
                                >
                                    <button
                                        onClick={handleSearchButton}
                                        className="px-4 py-2.5 text-base font-medium rounded-lg transition-colors min-w-[100px] 
                                            text-blue-600 hover:text-blue-700 hover:bg-blue-50 border border-blue-200"
                                    >
                                        Clear All
                                    </button>
                                </Tooltip>
                            )}
                        </div>

                        {/* Action buttons section - fixed width with consistent spacing */}
                        <div className="flex items-center gap-4 ml-auto">
                            <Tooltip
                                text="Need assistance?"
                                description="Contact me via WhatsApp for help with using the system or reporting issues"
                            >
                                <button
                                    onClick={() => setShowWhatsAppConfirmation(true)}
                                    className="px-6 py-2.5 text-base bg-white border hover:bg-gray-50 rounded-lg flex items-center gap-2 whitespace-nowrap"
                                >
                                    Help
                                </button>
                            </Tooltip>
                            <Tooltip
                                text="Export to Excel"
                                description="Download the current filtered list of projects as an Excel spreadsheet"
                            >
                                <button
                                    onClick={() => exportToExcel(filteredAndSortedData, 'thesis_projects.xlsx')}
                                    disabled={isLoading}
                                    className={`px-6 py-2.5 text-base whitespace-nowrap ${isLoading
                                        ? 'bg-gray-400 cursor-not-allowed'
                                        : 'bg-green-500 hover:bg-green-600'
                                        } text-white rounded-lg`}
                                >
                                    {isLoading ? 'Exporting...' : 'Export'}
                                </button>
                            </Tooltip>
                            <Tooltip
                                text="View Priority List"
                                description="Access your saved priority list of selected projects"
                            >
                                <button
                                    onClick={() => setShowPriorityList(true)}
                                    className="px-6 py-2.5 text-base bg-blue-500 text-white rounded-lg hover:bg-blue-600 whitespace-nowrap"
                                >
                                    Priority {priorityList.length > 0 && `(${priorityList.length})`}
                                </button>
                            </Tooltip>
                            <Tooltip
                                text="Update Priority List"
                                description="Apply pending changes to your priority list"
                            >
                                <button
                                    onClick={handleUpdatePriority}
                                    disabled={pendingChanges.length === 0}
                                    className={`px-6 py-2.5 text-base rounded-lg whitespace-nowrap ${pendingChanges.length === 0
                                        ? 'bg-gray-400 cursor-not-allowed text-gray-200'
                                        : 'bg-green-500 hover:bg-green-600 text-white'
                                        }`}
                                >
                                    Update Priority ({pendingChanges.length})
                                </button>
                            </Tooltip>
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className="px-6 py-2.5 text-base bg-white border rounded-lg flex items-center gap-2 whitespace-nowrap"
                            >
                                <Filter className="h-4 w-4" />
                                Filters {hasActiveFilters && `(${filterCounts.total})`}
                            </button>
                        </div>
                    </div>
                </div>
            </header>
        );
    };

    useEffect(() => {
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                if (showPriorityList) {
                    setShowPriorityList(false);
                } else if (showFilters) {
                    setShowFilters(false);
                }
            }
        };

        const handlePopState = () => {
            if (showPriorityList) {
                setShowPriorityList(false);
            } else if (showFilters) {
                setShowFilters(false);
            }
        };

        window.addEventListener('popstate', handlePopState);
        document.addEventListener('keydown', handleEscape);

        return () => {
            window.removeEventListener('popstate', handlePopState);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [showPriorityList, showFilters]);

    // Update useEffect to watch for filter and sort changes
    useEffect(() => {
        // Only clear expanded rows if filters change, not on initial load
        if (Object.values(multiFilters).some(filter =>
            filter instanceof Set ? filter.size > 0 : filter !== '')) {
            setExpandedRows(new Set());
        }
    }, [multiFilters, sortConfig]);

    // Reset selected projects to match priority list when opening modal
    useEffect(() => {
        if (showPriorityList) {
            setSelectedProjects(new Set(priorityList.map(project => project.projectTitle)));
            setPendingChanges([]); // Clear any pending changes
        }
    }, [showPriorityList, priorityList]);

    // Add handler for check all functionality
    const handleCheckAll = useCallback(() => {
        if (filteredAndSortedData.every(project => selectedProjects.has(project.projectTitle))) {
            // If all filtered items are selected, unselect all items (not just filtered ones)
            setSelectedProjects(new Set());
            setPendingChanges(priorityList.map(project => ({
                type: 'remove',
                project
            })));
        } else {
            // Select all filtered projects
            const newSelected = new Set(filteredAndSortedData.map(project => project.projectTitle));
            setSelectedProjects(newSelected);

            // Calculate pending changes
            const newChanges = [];

            // Add 'remove' changes for existing priority items not in filtered data
            priorityList.forEach(project => {
                if (!filteredAndSortedData.some(p => p.projectTitle === project.projectTitle)) {
                    newChanges.push({ type: 'remove', project });
                }
            });

            // Add 'add' changes for new selections
            filteredAndSortedData.forEach(project => {
                if (!priorityList.some(p => p.projectTitle === project.projectTitle)) {
                    newChanges.push({ type: 'add', project });
                }
            });

            setPendingChanges(newChanges);
        }
    }, [filteredAndSortedData, selectedProjects, priorityList]);

    // Add useEffect to save selectedProjects
    useEffect(() => {
        try {
            localStorage.setItem('selectedProjects', JSON.stringify(Array.from(selectedProjects)));
        } catch (error) {
            console.error('Error saving selected projects:', error);
        }
    }, [selectedProjects]);

    if (isMobile) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-blue-50 p-6">
                <div className="text-center max-w-md">
                    <div className="mb-6 text-red-500">
                        <svg
                            className="w-16 h-16 mx-auto"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                            />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        Mobile Access Restricted
                    </h1>
                    <p className="text-gray-600 mb-6">
                        This application is optimized for desktop use only. Please access it from a computer for the best experience.
                    </p>
                    <div className="p-4 bg-yellow-50 rounded-lg text-yellow-700 text-sm">
                        The complex nature of the thesis comparison system requires a larger screen for optimal functionality and readability.
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen p-4 mx-auto max-w-8xl bg-gradient-to-br from-gray-50/90 to-blue-50/90">
            <Header
                filteredAndSortedData={filteredAndSortedData}
                exportToExcel={exportToExcel}
                setShowPriorityList={setShowPriorityList}
                handleUpdatePriority={handleUpdatePriority}
                pendingChanges={pendingChanges}
                clearFilters={clearFilters}
                multiFilters={multiFilters}
                setMultiFilters={setMultiFilters}
                setShowFilters={setShowFilters}
                showFilters={showFilters}
                setShowWhatsAppConfirmation={setShowWhatsAppConfirmation}
                priorityList={priorityList}
            />

            {/* Move the filters modal after the header */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) {
                                setShowFilters(false);
                            }
                        }}
                    >
                        <div className="min-h-screen flex items-start justify-end">
                            <div className="h-screen p-6 w-[500px] bg-white/90 backdrop-blur-lg border-l border-gray-200">
                                <FiltersHeader clearFilters={clearFilters} />
                                <div className="grid grid-cols-1 gap-6">
                                    <FilterDropdown
                                        label="Supervisors"
                                        options={uniqueValues.supervisors}
                                        selected={multiFilters.supervisors}
                                        onChange={(value) => handleMultiFilterChange('supervisors', value)}
                                        className="hover:shadow-md"
                                    />
                                    <FilterDropdown
                                        label="Departments"
                                        options={uniqueValues.departments}
                                        selected={multiFilters.departments}
                                        onChange={(value) => handleMultiFilterChange('departments', value)}
                                        className="hover:shadow-md"
                                    />
                                    <FilterDropdown
                                        label="Research Fields"
                                        options={uniqueValues.fields}
                                        selected={multiFilters.fields}
                                        onChange={(value) => handleMultiFilterChange('fields', value)}
                                        className="hover:shadow-md"
                                    />
                                    <FilterDropdown
                                        label="Eligible Departments"
                                        options={uniqueValues.eligibleDepts}
                                        selected={multiFilters.eligibleDepts}
                                        onChange={(value) => handleMultiFilterChange('eligibleDepts', value)}
                                        className="hover:shadow-md"
                                    />
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <div className={`rounded-xl shadow-lg mx-2 mb-2 flex-1 bg-white/80 border-gray-200`}>
                <div className="relative h-[calc(100vh-143px)]">
                    <div
                        ref={tableContainerRef}
                        className="absolute inset-0 overflow-auto"
                    >
                        <table className="w-full table-fixed">
                            <thead className="sticky top-0 z-40 shadow-sm backdrop-blur-lg bg-white/90 border-b border-gray-200">
                                <tr>
                                    <th className="w-[72px] px-4 py-3">
                                        <div className="flex items-center justify-start gap-2.5 pl-1">
                                            <Tooltip
                                                text={filteredAndSortedData.every(project => selectedProjects.has(project.projectTitle))
                                                    ? "Unselect All" : "Select All"}
                                                description={`Click to ${filteredAndSortedData.every(project => selectedProjects.has(project.projectTitle))
                                                    ? 'unselect' : 'select'} all visible projects`}
                                            >
                                                <div
                                                    onClick={handleCheckAll}
                                                    className={`cursor-pointer p-2 rounded-lg transition-all active:scale-95
                                                        ${filteredAndSortedData.every(project => selectedProjects.has(project.projectTitle))
                                                            ? 'hover:bg-red-50 active:bg-red-100'
                                                            : 'hover:bg-blue-50 active:bg-blue-100'
                                                        }`}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={filteredAndSortedData.length > 0 &&
                                                            filteredAndSortedData.every(project =>
                                                                selectedProjects.has(project.projectTitle)
                                                            )}
                                                        indeterminate={filteredAndSortedData.some(project =>
                                                            selectedProjects.has(project.projectTitle)
                                                        ) && !filteredAndSortedData.every(project =>
                                                            selectedProjects.has(project.projectTitle)
                                                        )}
                                                        onChange={() => { }} // Handled by div onClick
                                                        className={`rounded w-4 h-4 cursor-pointer transition-all focus:ring-2
                                                            ${filteredAndSortedData.every(project => selectedProjects.has(project.projectTitle))
                                                                ? 'hover:border-red-500 focus:ring-red-500'
                                                                : 'hover:border-blue-500 focus:ring-blue-500'
                                                            }`}
                                                    />
                                                </div>
                                            </Tooltip>
                                        </div>
                                    </th>
                                    <SortableHeader title="Supervisor(s)" sortKey="supervisorName" sortConfig={sortConfig} handleSort={handleSort} className="w-[22%]" />
                                    <SortableHeader title="Project Title" sortKey="projectTitle" sortConfig={sortConfig} handleSort={handleSort} className="w-[30%]" />
                                    <th className={`w-[16%] px-4 py-3 text-left`}>Research Field</th>
                                    <th className={`w-[16%] px-4 py-3 text-left`}>Department</th>
                                    <th className={`w-[16%] px-4 py-3 text-left`}>Eligibility</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-gray-700">
                                {filteredAndSortedData.map((project, index) => (
                                    <React.Fragment key={`${project.projectTitle}-${index}`}>
                                        <tr
                                            onClick={(e) => {
                                                // Only expand if not clicking the checkbox area
                                                if (!e.target.closest('.checkbox-area')) {
                                                    setExpandedRows((prev) => {
                                                        const newSet = new Set(prev);
                                                        if (prev.has(index)) {
                                                            newSet.delete(index);
                                                        } else {
                                                            newSet.add(index);
                                                        }
                                                        return newSet;
                                                    });
                                                }
                                            }}
                                            className={`cursor-pointer hover:bg-gray-50/80 transition-colors group`}
                                        >
                                            <td className="px-4 py-4">
                                                <div className="flex items-center justify-start gap-2.5 pl-1 checkbox-area">
                                                    <Tooltip
                                                        text="Add to Priority List"
                                                        description="Select this project to add it to your priority list"
                                                    >
                                                        <div
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleProjectSelection(project.projectTitle);
                                                            }}
                                                            className="cursor-pointer"
                                                        >
                                                            <input
                                                                type="checkbox"
                                                                checked={selectedProjects.has(project.projectTitle)}
                                                                onChange={() => { }} // Handled by div onClick
                                                                className="rounded w-3.5 h-3.5"
                                                            />
                                                        </div>
                                                    </Tooltip>
                                                    <Tooltip
                                                        text={expandedRows.has(index) ? "Hide Details" : "Show Details"}
                                                        description={expandedRows.has(index)
                                                            ? "Click to collapse project details"
                                                            : "Click to expand and view full project details"}
                                                    >
                                                        <motion.div
                                                            animate={{ rotate: expandedRows.has(index) ? 180 : 0 }}
                                                            transition={{ duration: 0.2 }}
                                                        >
                                                            <ChevronDown className="h-4 w-4 text-gray-600" />
                                                        </motion.div>
                                                    </Tooltip>
                                                </div>
                                            </td>
                                            <td className={`px-4 py-4`}>
                                                <div className="text-sm">
                                                    <HighlightedText
                                                        text={project.supervisorName}
                                                        searchTerm={debouncedSearchTerm}
                                                    />
                                                    {project.coSupervisor && (
                                                        <>
                                                            <br />
                                                            <HighlightedText
                                                                text={project.coSupervisor}
                                                                searchTerm={debouncedSearchTerm}
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                                <div className={`text-sm text-gray-600`}>
                                                    <HighlightedText
                                                        text={project.supervisorEmail}
                                                        searchTerm={debouncedSearchTerm}
                                                    />
                                                    {project.coSupervisorEmail && (
                                                        <>
                                                            <br />
                                                            <HighlightedText
                                                                text={project.coSupervisorEmail}
                                                                searchTerm={debouncedSearchTerm}
                                                            />
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                            <td className={`px-4 py-4`}>
                                                <HighlightedText
                                                    text={project.projectTitle}
                                                    searchTerm={debouncedSearchTerm}
                                                />
                                            </td>
                                            <td className={`px-4 py-4`}>
                                                <HighlightedText
                                                    text={project.researchField}
                                                    searchTerm={debouncedSearchTerm}
                                                />
                                            </td>
                                            <td className={`px-4 py-4`}>
                                                <HighlightedText
                                                    text={project.department}
                                                    searchTerm={debouncedSearchTerm}
                                                />
                                            </td>
                                            <td className="px-4 py-4">
                                                <div className="flex flex-wrap gap-1">
                                                    {(project.eligibleDepartments || []).map((dept) => (
                                                        <span
                                                            key={dept}
                                                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium 
                            bg-emerald-50/90 text-emerald-700`}
                                                        >
                                                            <HighlightedText
                                                                text={dept}
                                                                searchTerm={debouncedSearchTerm}
                                                            />
                                                        </span>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                        <AnimatePresence>
                                            {expandedRows.has(index) && (
                                                <motion.tr
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <td colSpan="6" className={`px-4 py-4 bg-gray-50/80`}>
                                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                            <Card className="">
                                                                <CardContent>
                                                                    <h3 className={`font-medium mb-2 text-gray-900`}>
                                                                        Project Description
                                                                    </h3>
                                                                    <div className={`text-sm text-gray-600 whitespace-pre-line`}>
                                                                        <HighlightedText
                                                                            text={project.projectDescription}
                                                                            searchTerm={debouncedSearchTerm}
                                                                        />
                                                                    </div>
                                                                </CardContent>
                                                            </Card>

                                                            <Card className="">
                                                                <CardContent>
                                                                    <h3 className={`font-medium mb-2 text-gray-900`}>
                                                                        Project Methodology
                                                                    </h3>
                                                                    <div className={`text-sm text-gray-600 whitespace-pre-line`}>
                                                                        <HighlightedText
                                                                            text={Array.isArray(project.projectMethodology)
                                                                                ? project.projectMethodology.join('\n')
                                                                                : project.projectMethodology}
                                                                            searchTerm={debouncedSearchTerm}
                                                                        />
                                                                    </div>
                                                                </CardContent>
                                                            </Card>

                                                            <Card className="">
                                                                <CardContent>
                                                                    <h3 className={`font-medium mb-2 text-gray-900`}>
                                                                        Required Qualifications
                                                                    </h3>
                                                                    <div className={`text-sm text-gray-600 whitespace-pre-line`}>
                                                                        <HighlightedText
                                                                            text={Array.isArray(project.qualifications)
                                                                                ? project.qualifications.join('\n')
                                                                                : project.qualifications}
                                                                            searchTerm={debouncedSearchTerm}
                                                                        />
                                                                    </div>
                                                                </CardContent>
                                                            </Card>

                                                            <Card className="">
                                                                <CardContent>
                                                                    <h3 className={`font-medium mb-2 text-gray-900`}>
                                                                        Additional Comments
                                                                    </h3>
                                                                    <div className={`text-sm text-gray-600 whitespace-pre-line`}>
                                                                        <HighlightedText
                                                                            text={project.furtherComments}
                                                                            searchTerm={debouncedSearchTerm}
                                                                        />
                                                                    </div>
                                                                </CardContent>
                                                            </Card>
                                                        </div>
                                                    </td>
                                                </motion.tr>
                                            )}
                                        </AnimatePresence>
                                    </React.Fragment>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            {showPriorityList && (
                <PriorityListModal
                    priorityList={priorityList}
                    setPriorityList={setPriorityList}
                    setShowPriorityList={setShowPriorityList}
                    setShowClearConfirmation={setShowClearConfirmation}
                    exportToExcel={exportToExcel}
                    setSelectedProjects={setSelectedProjects}
                    setToast={setToast}
                />
            )}

            <ConfirmationModal
                isOpen={showClearConfirmation}
                onClose={() => setShowClearConfirmation(false)}
                onConfirm={clearPriorityList}
                message="Are you sure you want to clear the priority list? This action cannot be undone."
            />

            <ConfirmationModal
                isOpen={showWhatsAppConfirmation}
                onClose={() => setShowWhatsAppConfirmation(false)}
                onConfirm={handleWhatsAppHelp}
                message="You will be redirected to WhatsApp to contact support. Continue?"
            />

            <AnimatePresence>
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    );
}