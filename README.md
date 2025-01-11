# Spring 2025 - Bachelor Thesis Topics

This project is a personal, ungraded React-based web application designed to help Mechatronics students compare and filter potential bachelor thesis topics offered in the Spring 2025 semester. It was developed in just 5 days during finals, with no prior experience in react, as a solution to a personal need. It provides a user-friendly interface to explore topics from various departments, research fields, and supervisors, along with detailed descriptions and requirements for each thesis. The project heavily utilized AI tools like ChatGPT, Claude, Gemini, and the Cursor VS Code extension for development.

## Table of Contents

-   [Project Structure](#project-structure)
-   [Functionality](#functionality)
    -   [Filtering](#filtering)
    -   [Sorting](#sorting)
    -   [Searching](#searching)
    -   [Expanding Rows](#expanding-rows)
    -   [Priority List](#priority-list)
    -   [Exporting to Excel](#exporting-to-excel)
    -   [Additional Features](#additional-features)
-   [Components](#components)
    -   [Header](#header)
    -   [Filters](#filters)
    -   [FilterDropdown](#filterdropdown)
    -   [Card](#card)
    -   [CardContent](#cardcontent)
    -   [HighlightedText](#highlightedtext)
    -   [ConfirmationModal](#confirmationmodal)
    -   [SortableHeader](#sortableheader)
    -   [ProjectDetailsPopup](#projectdetailspopup)
    -   [PriorityListModal](#prioritylistmodal)
    -   [Toast](#toast)
    -   [Tooltip](#tooltip)
-   [Data](#data)
-   [Styling](#styling)
-   [Testing](#testing)
-   [Deployment](#deployment)
-   [Dependencies](#dependencies)
-   [Scripts](#scripts)
-   [Disclaimer](#disclaimer)

## Project Structure

├── build              # Production build files
│   ├── ...
├── public             # Public assets
│   ├── index.html
│   ├── ...
└── src                # Source code
├── App.js
├── Data.js
├── ThesisComparison.js
├── ...

## Functionality

### Filtering

Users can filter thesis topics by:

-   Supervisor
-   Department
-   Research Field
-   Eligible Departments

### Sorting

The table of thesis topics can be sorted by:

-   Supervisor
-   Project Title

### Searching

Users can search for specific keywords within the thesis title, supervisor name, department, research field, project description, methodology, qualifications, comments, and eligible departments.

### Expanding Rows

Each row in the table can be expanded to reveal detailed information about the thesis topic, including:

-   Project Description
-   Project Methodology
-   Required Qualifications
-   Additional Comments

### Priority List

Users can select thesis topics and add them to a priority list. This list can be reordered, exported to Excel, or cleared.

### Exporting to Excel

The main table of thesis topics, as well as the priority list, can be exported to an Excel spreadsheet.

### Additional Features

-   A "Help" button redirects users to my WhatsApp for support.
-   A toast notification appears after exporting to Excel or clearing the priority list.
-   Tooltips provide additional information and guidance throughout the application.

## Components

### Header

The header contains:

-   Project statistics (number of projects, last updated date)
-   Search bar
-   Action buttons (Help, Export, Priority List, Filters)

### Filters

The filters section allows users to refine the list of thesis topics by various criteria.

### FilterDropdown

A dropdown component for selecting filter options.

### Card

A styled card component for displaying information in a visually appealing way.

### CardContent

The content of a card component.

### HighlightedText

Highlights search terms within text.

### ConfirmationModal

A modal for confirming actions, such as clearing the priority list.

### SortableHeader

A table header that allows sorting by clicking.

### ProjectDetailsPopup

A popup for displaying detailed information about a thesis topic.

### PriorityListModal

A modal for managing the priority list.

### Toast

A notification that appears after certain actions.

### Tooltip

Provides additional information on hover.

## Data

The thesis topic data is stored in `src/Data.js`.

## Styling

The project uses Tailwind CSS for styling.

## Testing

The project includes basic tests.

## Deployment

The project is deployed to GitHub Pages.

## Dependencies

-   `react`: JavaScript library for building user interfaces
-   `react-dom`: React package for working with the DOM
-   `lucide-react`: Icon library
-   `xlsx`: Library for working with Excel spreadsheets
-   `use-debounce`: Hook for debouncing input
-   `framer-motion`: Animation library

## Scripts

-   `npm start`: Starts the development server
-   `npm run build`: Builds the app for production
-   `npm run test`: Runs the tests
-   `npm run eject`: Ejects the app from Create React App
-   `npm run predeploy`: Builds the app for deployment
-   `npm run deploy`: Deploys the app to GitHub Pages

## Disclaimer

This project was developed as a personal tool and is not officially affiliated with any university or institution. The data presented should be verified with official sources.
