// =============================================================================
// ESTADO DE LA APLICACIÓN
// =============================================================================
class AppState {
    constructor() {
        this.persons = [];
        this.documents = [];
        this.categories = [];
        this.dashboardStats = {
            totalPersonas: 0,
            totalDocumentos: 0,
            proximosVencer: 0,
            totalCategorias: 0
        };
        this.currentTab = 'dashboard';
        this.selectedFile = null;
        this.isLoading = false;
        this.filters = {
            category: '',
            type: '',
            date: '',
            status: ''
        };
        this.searchResults = [];
        this.currentSearchQuery = '';
    }

    logState() {
        console.group('App State');
        console.log('Persons:', this.persons);
        console.log('Documents:', this.documents);
        console.log('Categories:', this.categories);
        console.log('Dashboard Stats:', this.dashboardStats);
        console.log('Current Tab:', this.currentTab);
        console.log('Selected File:', this.selectedFile);
        console.log('Filters:', this.filters);
        console.log('Search Results:', this.searchResults);
        console.log('Current Search Query:', this.currentSearchQuery);
        console.groupEnd();
    }
}

export { AppState };