class PartsDatabase {
    constructor() {
        this.currentTab = 'builder'; // 'gpu', 'cpu', 'motherboard', 'ram', 'psu', 'cooler', or 'builder'
        this.currentCategory = 'gpus';
        this.currentManufacturer = '';

        // Layout mode: 'single' or 'double'
        this.layoutMode = 'double'; // Change to 'single' for 1-column layout

        // Modal state
        this.currentModalType = '';
        this.currentSortColumn = 'name';
        this.currentSortDirection = 'asc';
        this.variantsCache = new Map(); // Cache for variants by component key
        this.activeBadgeFilters = new Set(); // Active badge filters (manufacturer, tier, value)
        this.minPrice = null; // Minimum price filter
        this.maxPrice = null; // Maximum price filter
        this.searchTerm = ''; // Search term for component filtering
        this.cpuPerformanceMode = 'singleThread'; // 'singleThread' or 'multiThread' for CPU statistics
        this.debugMode = false; // Debug mode to show component popularity scores

        // GPU Performance Benchmarks
        this.gpuBenchmarks = {
            'RTX 5090': 197.5,
            'RTX 5080': 178.5,
            'RTX 5070 Ti': 169.3,
            'RTX 5070': 149.1,
            'RTX 5060 Ti': 120.3,
            'RTX 5060': 102.7,
            'RTX 4090': 195.6,
            'RTX 4080 Super': 177.2,
            'RTX 4080': 175,
            'RTX 4070 Ti Super': 161.3,
            'RTX 4070 Ti': 155.1,
            'RTX 4070 Super': 147.6,
            'RTX 4070': 130.7,
            'RTX 4060 Ti': 103.2,
            'RTX 4060': 83.9,
            'RTX 3090 Ti': 131.6,
            'RTX 3090': 128.1,
            'RTX 3080 Ti': 126.2,
            'RTX 3080': 125.8,
            'RTX 3070 Ti': 98.59404601,
            'RTX 3070': 99.8,
            'RTX 3060 Ti': 91.5,
            'RTX 3060': 70.2,
            'RTX 3050': 51.4,
            'RX 7900 XTX': 174.1,
            'RX 7900 XT': 163.1,
            'RX 7800 XT': 133.2,
            'RX 7700 XT': 114.5,
            'RX 7600 XT': 84.6,
            'RX 7600': 79.3,
            'RX 6950 XT': 153,
            'RX 6900 XT': 145,
            'RX 6800 XT': 132,
            'RX 6800': 120,
            'RX 6750 XT': 110,
            'RX 6700 XT': 105,
            'RX 6650 XT': 93,
            'RX 6600 XT': 80,
            'RX 6600': 64.1,
            'RX 6500 XT': 40.76102842,
            'RX 6400': 31.36481732,
            'Arc A770': 63.4,
            'Arc A750': 57.4,
            'Arc A580': 80,
            'Arc A380': 37.45250338,
            'Arc B570': 72.4,
            'Arc B580': 80.364
        };

        this.allParts = []; // Current active parts (GPUs, CPUs, Motherboards, RAM, PSUs, or Coolers)
        this.filteredParts = [];
        this.allGPUs = [];
        this.allCPUs = [];
        this.allMotherboards = [];
        this.allRAM = [];
        this.allPSUs = [];
        this.allCoolers = [];
        this.allStorage = [];
        this.allCases = [];
        this.allAddons = [];
        this.manufacturers = new Set();
        this.stats = { total: 0, manufacturers: 0 };
        this.selectedGPU = null;
        this.selectedCPU = null;
        this.selectedMotherboard = null;
        this.selectedRAM = null;
        this.selectedPSU = null;
        this.selectedCooler = null;
        this.selectedStorage = null;
        this.selectedCase = null;

        // PC Builder properties
        this.currentBuild = {
            gpu: null,
            cpu: null,
            motherboard: null,
            ram: null,
            cooler: null,
            psu: null,
            storage: null,
            case: null,
            addon: null,
            addon2: null,
            addon3: null,
            addon4: null,
            addon5: null,
            addon6: null
        };
        this.totalPrice = 0;

        this.initializeEventListeners();
        this.loadInitialData();

        // Initialize storage plus buttons visibility
        this.updateStoragePlusButtons();

        // Initialize addon plus buttons visibility
        this.updateAddonPlusButtons();

        console.log('PartsDatabase initialized successfully');
    }

    initializeEventListeners() {
        // Main tab navigation
        document.querySelectorAll('.main-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Category navigation (manufacturer filter)
        document.querySelectorAll('.nav-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.setActiveManufacturer(e.target.dataset.category);
            });
        });

        // Search functionality (optional - only if elements exist)
        const searchBtn = document.getElementById('searchBtn');
        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                this.performSearch();
            });
        }

        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.performSearch();
                }
            });
        }

        // Filters (optional - only if elements exist)
        const manufacturerFilter = document.getElementById('manufacturerFilter');
        if (manufacturerFilter) {
            manufacturerFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        const priceFilter = document.getElementById('priceFilter');
        if (priceFilter) {
            priceFilter.addEventListener('change', () => {
                this.applyFilters();
            });
        }

        const clearFilters = document.getElementById('clearFilters');
        if (clearFilters) {
            clearFilters.addEventListener('click', () => {
                this.clearAllFilters();
            });
        }

        // GPU Selector functionality
        document.getElementById('gpuSelect').addEventListener('change', (e) => {
            this.handleGpuSelection(e.target.value);
        });

        document.getElementById('selectGpuBtn').addEventListener('click', () => {
            this.selectGPU();
        });

        document.getElementById('changeGpuBtn').addEventListener('click', () => {
            this.showGpuSelector();
        });

        document.getElementById('buildAroundGpuBtn').addEventListener('click', () => {
            this.buildAroundGPU();
        });

        // CPU Selector functionality
        document.getElementById('browseCpusBtn').addEventListener('click', () => {
            this.openCpuSelectorModal();
        });

        document.getElementById('changeCpuBtn').addEventListener('click', () => {
            this.showCpuSelector();
        });

        document.getElementById('buildAroundCpuBtn').addEventListener('click', () => {
            this.buildAroundCPU();
        });

        // Motherboard Selector functionality
        document.getElementById('motherboardSelect').addEventListener('change', (e) => {
            this.handleMotherboardSelection(e.target.value);
        });

        document.getElementById('selectMotherboardBtn').addEventListener('click', () => {
            this.selectMotherboard();
        });

        document.getElementById('changeMotherboardBtn').addEventListener('click', () => {
            this.showMotherboardSelector();
        });

        document.getElementById('buildAroundMotherboardBtn').addEventListener('click', () => {
            this.buildAroundMotherboard();
        });

        // RAM Selector functionality
        document.getElementById('ramSelect').addEventListener('change', (e) => {
            this.handleRamSelection(e.target.value);
        });

        document.getElementById('selectRamBtn').addEventListener('click', () => {
            this.selectRAM();
        });

        document.getElementById('changeRamBtn').addEventListener('click', () => {
            this.showRamSelector();
        });

        document.getElementById('buildAroundRamBtn').addEventListener('click', () => {
            this.buildAroundRAM();
        });

        // PSU Selector functionality
        document.getElementById('psuSelect').addEventListener('change', (e) => {
            this.handlePsuSelection(e.target.value);
        });

        document.getElementById('selectPsuBtn').addEventListener('click', () => {
            this.selectPSU();
        });

        document.getElementById('changePsuBtn').addEventListener('click', () => {
            this.showPsuSelector();
        });

        document.getElementById('buildAroundPsuBtn').addEventListener('click', () => {
            this.buildAroundPSU();
        });

        // Cooler Selector functionality
        document.getElementById('coolerSelect').addEventListener('change', (e) => {
            this.handleCoolerSelection(e.target.value);
        });

        document.getElementById('selectCoolerBtn').addEventListener('click', () => {
            this.selectCooler();
        });

        document.getElementById('changeCoolerBtn').addEventListener('click', () => {
            this.showCoolerSelector();
        });

        document.getElementById('buildAroundCoolerBtn').addEventListener('click', () => {
            this.buildAroundCooler();
        });

        // PC Builder event listeners - Updated for popup selectors
        document.getElementById('builderGpuSelectBtn').addEventListener('click', () => {
            this.openComponentModal('gpu');
        });
        
        document.getElementById('builderCpuSelectBtn').addEventListener('click', () => {
            this.openComponentModal('cpu');
        });
        
        document.getElementById('builderMotherboardSelectBtn').addEventListener('click', () => {
            this.openComponentModal('motherboard');
        });
        
        document.getElementById('builderRamSelectBtn').addEventListener('click', () => {
            this.openComponentModal('ram');
        });
        
        document.getElementById('builderCoolerSelectBtn').addEventListener('click', () => {
            this.openComponentModal('cooler');
        });
        
        document.getElementById('builderPsuSelectBtn').addEventListener('click', () => {
            this.openComponentModal('psu');
        });

        document.getElementById('builderCaseSelectBtn').addEventListener('click', () => {
            this.openComponentModal('case');
        });

        document.getElementById('builderStorageSelectBtn').addEventListener('click', () => {
            this.openComponentModal('storage');
        });

        document.getElementById('builderStorage2SelectBtn').addEventListener('click', () => {
            this.openComponentModal('storage2');
        });

        document.getElementById('builderStorage3SelectBtn').addEventListener('click', () => {
            this.openComponentModal('storage3');
        });

        document.getElementById('builderStorage4SelectBtn').addEventListener('click', () => {
            this.openComponentModal('storage4');
        });

        document.getElementById('builderStorage5SelectBtn').addEventListener('click', () => {
            this.openComponentModal('storage5');
        });

        document.getElementById('builderStorage6SelectBtn').addEventListener('click', () => {
            this.openComponentModal('storage6');
        });

        document.getElementById('builderStorage7SelectBtn').addEventListener('click', () => {
            this.openComponentModal('storage7');
        });

        // Remove component buttons
        document.getElementById('removeGpuBtn').addEventListener('click', () => {
            this.removeBuilderComponent('gpu');
        });

        document.getElementById('removeCpuBtn').addEventListener('click', () => {
            this.removeBuilderComponent('cpu');
        });
        
        document.getElementById('removeMotherboardBtn').addEventListener('click', () => {
            this.removeBuilderComponent('motherboard');
        });
        
        document.getElementById('removeRamBtn').addEventListener('click', () => {
            this.removeBuilderComponent('ram');
        });
        
        document.getElementById('removeCoolerBtn').addEventListener('click', () => {
            this.removeBuilderComponent('cooler');
        });
        
        document.getElementById('removePsuBtn').addEventListener('click', () => {
            this.removeBuilderComponent('psu');
        });

        document.getElementById('removeCaseBtn').addEventListener('click', () => {
            this.removeBuilderComponent('case');
        });

        document.getElementById('removeStorageBtn').addEventListener('click', () => {
            this.removeBuilderComponent('storage');
        });

        document.getElementById('removeStorage2Btn').addEventListener('click', () => {
            this.removeBuilderComponent('storage2');
        });

        document.getElementById('removeStorage3Btn').addEventListener('click', () => {
            this.removeBuilderComponent('storage3');
        });

        document.getElementById('removeStorage4Btn').addEventListener('click', () => {
            this.removeBuilderComponent('storage4');
        });

        document.getElementById('removeStorage5Btn').addEventListener('click', () => {
            this.removeBuilderComponent('storage5');
        });

        document.getElementById('removeStorage6Btn').addEventListener('click', () => {
            this.removeBuilderComponent('storage6');
        });

        document.getElementById('removeStorage7Btn').addEventListener('click', () => {
            this.removeBuilderComponent('storage7');
        });

        // Close storage section buttons
        document.getElementById('closeStorage2Btn').addEventListener('click', () => {
            this.closeStorageSection(2);
        });

        document.getElementById('closeStorage3Btn').addEventListener('click', () => {
            this.closeStorageSection(3);
        });

        document.getElementById('closeStorage4Btn').addEventListener('click', () => {
            this.closeStorageSection(4);
        });

        document.getElementById('closeStorage5Btn').addEventListener('click', () => {
            this.closeStorageSection(5);
        });

        document.getElementById('closeStorage6Btn').addEventListener('click', () => {
            this.closeStorageSection(6);
        });

        document.getElementById('closeStorage7Btn').addEventListener('click', () => {
            this.closeStorageSection(7);
        });

        // Add storage section buttons
        document.getElementById('addStorageBtn1').addEventListener('click', () => {
            this.addStorageSection();
        });

        document.getElementById('addStorageBtn2').addEventListener('click', () => {
            this.addStorageSection();
        });

        document.getElementById('addStorageBtn3').addEventListener('click', () => {
            this.addStorageSection();
        });

        document.getElementById('addStorageBtn4').addEventListener('click', () => {
            this.addStorageSection();
        });

        document.getElementById('addStorageBtn5').addEventListener('click', () => {
            this.addStorageSection();
        });

        document.getElementById('addStorageBtn6').addEventListener('click', () => {
            this.addStorageSection();
        });

        document.getElementById('addStorageBtn7').addEventListener('click', () => {
            this.addStorageSection();
        });

        // Addon select buttons
        document.getElementById('builderAddonSelectBtn').addEventListener('click', () => {
            this.openComponentModal('addon');
        });

        document.getElementById('builderAddon2SelectBtn').addEventListener('click', () => {
            this.openComponentModal('addon2');
        });

        document.getElementById('builderAddon3SelectBtn').addEventListener('click', () => {
            this.openComponentModal('addon3');
        });

        document.getElementById('builderAddon4SelectBtn').addEventListener('click', () => {
            this.openComponentModal('addon4');
        });

        document.getElementById('builderAddon5SelectBtn').addEventListener('click', () => {
            this.openComponentModal('addon5');
        });

        document.getElementById('builderAddon6SelectBtn').addEventListener('click', () => {
            this.openComponentModal('addon6');
        });

        // Remove addon buttons
        document.getElementById('removeAddonBtn').addEventListener('click', () => {
            this.removeBuilderComponent('addon');
        });

        document.getElementById('removeAddon2Btn').addEventListener('click', () => {
            this.removeBuilderComponent('addon2');
        });

        document.getElementById('removeAddon3Btn').addEventListener('click', () => {
            this.removeBuilderComponent('addon3');
        });

        document.getElementById('removeAddon4Btn').addEventListener('click', () => {
            this.removeBuilderComponent('addon4');
        });

        document.getElementById('removeAddon5Btn').addEventListener('click', () => {
            this.removeBuilderComponent('addon5');
        });

        document.getElementById('removeAddon6Btn').addEventListener('click', () => {
            this.removeBuilderComponent('addon6');
        });

        // Close addon section buttons
        document.getElementById('closeAddon2Btn').addEventListener('click', () => {
            this.closeAddonSection(2);
        });

        document.getElementById('closeAddon3Btn').addEventListener('click', () => {
            this.closeAddonSection(3);
        });

        document.getElementById('closeAddon4Btn').addEventListener('click', () => {
            this.closeAddonSection(4);
        });

        document.getElementById('closeAddon5Btn').addEventListener('click', () => {
            this.closeAddonSection(5);
        });

        document.getElementById('closeAddon6Btn').addEventListener('click', () => {
            this.closeAddonSection(6);
        });

        // Add addon section buttons
        document.getElementById('addAddonBtn1').addEventListener('click', () => {
            this.addAddonSection();
        });

        document.getElementById('addAddonBtn2').addEventListener('click', () => {
            this.addAddonSection();
        });

        document.getElementById('addAddonBtn3').addEventListener('click', () => {
            this.addAddonSection();
        });

        document.getElementById('addAddonBtn4').addEventListener('click', () => {
            this.addAddonSection();
        });

        document.getElementById('addAddonBtn5').addEventListener('click', () => {
            this.addAddonSection();
        });

        document.getElementById('addAddonBtn6').addEventListener('click', () => {
            this.addAddonSection();
        });

        // Build action buttons
        document.getElementById('clearBuildBtn').addEventListener('click', () => {
            this.clearBuild();
        });

        document.getElementById('shareBuildBtn').addEventListener('click', () => {
            this.shareBuild();
        });

        document.getElementById('addToAmazonCartBtn').addEventListener('click', () => {
            this.addToAmazonCart();
        });

        // Set initial button state
        this.updateBuildActions();
    }

    // Tab switching functionality
    switchTab(tabName) {
        // Update active tab
        document.querySelectorAll('.main-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });

        // Show/hide tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        // Update current tab and load appropriate data
        this.currentTab = tabName;
        this.updateHeaderForTab();
        
        if (tabName === 'gpu') {
            this.allParts = this.allGPUs;
            this.currentCategory = 'gpus';
            this.loadGPUStats();
            this.setActiveManufacturer('gpus');
        } else if (tabName === 'cpu') {
            this.allParts = this.allCPUs;
            this.currentCategory = 'cpus';
            this.loadCPUStats();
            this.setActiveManufacturer('cpus');
        } else if (tabName === 'motherboard') {
            this.allParts = this.allMotherboards;
            this.currentCategory = 'motherboards';
            this.loadMotherboardStats();
            this.setActiveManufacturer('motherboards');
        } else if (tabName === 'ram') {
            this.allParts = this.allRAM;
            this.currentCategory = 'rams';
            this.loadRAMStats();
            this.setActiveManufacturer('rams');
        } else if (tabName === 'psu') {
            this.allParts = this.allPSUs;
            this.currentCategory = 'psus';
            this.loadPSUStats();
            this.setActiveManufacturer('psus');
        } else if (tabName === 'cooler') {
            this.allParts = this.allCoolers;
            this.currentCategory = 'coolers';
            this.loadCoolerStats();
            this.setActiveManufacturer('coolers');
        } else if (tabName === 'builder') {
            this.initializePCBuilder();
        }
    }

    updateHeaderForTab() {
        const headerTitle = document.getElementById('headerTitle');
        const headerDescription = document.getElementById('headerDescription');

        if (!headerTitle || !headerDescription) return;

        // Keep the header simple - always show PC Builder
        headerTitle.textContent = 'PC Builder';
        headerDescription.textContent = 'Build your custom PC by selecting components';
    }

    async loadInitialData() {
        // Load overall stats for the header
        this.loadOverallStats();

        // Load all component data in parallel
        await Promise.all([
            this.loadAllGPUs(),      // Load GPU data by default (initial tab)
            this.loadAllCPUs(),
            this.loadAllMotherboards(),
            this.loadAllRAM(),
            this.loadAllPSUs(),
            this.loadAllCoolers(),
            this.loadAllStorage(),
            this.loadAllCases(),
            this.loadAllAddons()
        ]);

        // After all data is loaded, check if there's a build to restore from URL
        this.loadBuildFromURL();
    }

    async loadOverallStats() {
        try {
            const response = await fetch('/api/stats');
            if (response.ok) {
                const stats = await response.json();
                this.stats.total = stats.total || 0;
                // Stats display removed from UI
            }
        } catch (error) {
            console.error('Error loading overall stats:', error);
        }
    }

    async loadGPUStats() {
        try {
            const response = await fetch('/api/stats');
            if (response.ok) {
                const stats = await response.json();
                this.stats.total = stats.gpus || 0;
                const el = document.getElementById('totalParts'); if (el) el.textContent = this.stats.total;
            }
        } catch (error) {
            console.error('Error loading GPU stats:', error);
            const el = document.getElementById('totalParts'); if (el) el.textContent = 'N/A';
        }
    }

    async loadCPUStats() {
        try {
            const response = await fetch('/api/stats');
            if (response.ok) {
                const stats = await response.json();
                this.stats.total = stats.cpus || 0;
                const el = document.getElementById('totalParts'); if (el) el.textContent = this.stats.total;
            }
        } catch (error) {
            console.error('Error loading CPU stats:', error);
            const el = document.getElementById('totalParts'); if (el) el.textContent = 'N/A';
        }
    }

    async loadAllCPUs() {
        this.showLoading();
        try {
            const response = await fetch('/api/parts/cpus');
            if (response.ok) {
                this.allCPUs = await response.json();
                console.log('Loaded CPUs:', this.allCPUs.length);
                this.refreshModalIfOpen('cpu');
                // CPUs are now loaded and ready for the modal
                if (this.currentTab === 'cpu') {
                    this.allParts = this.allCPUs;
                    this.setActiveManufacturer('cpus');
                }
            } else {
                console.error('Failed to load CPUs:', response.status);
                this.showError();
            }
        } catch (error) {
            console.error('Error loading CPUs:', error);
            this.showError();
        } finally {
            this.hideLoading();
        }
    }

    async loadMotherboardStats() {
        try {
            const response = await fetch('/api/stats');
            if (response.ok) {
                const stats = await response.json();
                this.stats.total = stats.motherboards || 0;
                const el = document.getElementById('totalParts'); if (el) el.textContent = this.stats.total;
            }
        } catch (error) {
            console.error('Error loading Motherboard stats:', error);
            const el = document.getElementById('totalParts'); if (el) el.textContent = 'N/A';
        }
    }

    async loadAllMotherboards() {
        this.showLoading();
        try {
            const response = await fetch('/api/parts/motherboards');
            if (response.ok) {
                const allData = await response.json();

                // Filter out unavailable motherboards
                this.allMotherboards = allData.filter(motherboard => {
                    return motherboard.isAvailable !== false;
                });

                console.log(`Loaded ${this.allMotherboards.length} Motherboards (filtered out ${allData.length - this.allMotherboards.length} unavailable)`);
                this.refreshModalIfOpen('motherboard');
                this.populateMotherboardSelector();
                if (this.currentTab === 'motherboard') {
                    this.allParts = this.allMotherboards;
                    this.setActiveManufacturer('motherboards');
                }
            } else {
                console.error('Failed to load Motherboards:', response.status);
                this.showError();
            }
        } catch (error) {
            console.error('Error loading Motherboards:', error);
            this.showError();
        } finally {
            this.hideLoading();
        }
    }

    async loadRAMStats() {
        try {
            const response = await fetch('/api/stats');
            if (response.ok) {
                const stats = await response.json();
                this.stats.total = stats.rams || 0;
                const el = document.getElementById('totalParts'); if (el) el.textContent = this.stats.total;
            }
        } catch (error) {
            console.error('Error loading RAM stats:', error);
            const el = document.getElementById('totalParts'); if (el) el.textContent = 'N/A';
        }
    }

    async loadPSUStats() {
        try {
            const response = await fetch('/api/stats');
            if (response.ok) {
                const stats = await response.json();
                this.stats.total = stats.psus || 0;
                const el = document.getElementById('totalParts'); if (el) el.textContent = this.stats.total;
            }
        } catch (error) {
            console.error('Error loading PSU stats:', error);
            const el = document.getElementById('totalParts'); if (el) el.textContent = 'N/A';
        }
    }

    async loadCoolerStats() {
        try {
            const response = await fetch('/api/stats');
            if (response.ok) {
                const stats = await response.json();
                this.stats.total = stats.coolers || 0;
                const el = document.getElementById('totalParts'); if (el) el.textContent = this.stats.total;
            }
        } catch (error) {
            console.error('Error loading Cooler stats:', error);
            const el = document.getElementById('totalParts'); if (el) el.textContent = 'N/A';
        }
    }

    async loadAllRAM() {
        this.showLoading();
        try {
            const response = await fetch('/api/parts/rams');
            if (response.ok) {
                this.allRAM = await response.json();
                console.log('Loaded RAM:', this.allRAM.length);
                this.refreshModalIfOpen('ram');
                this.populateRamSelector();
                if (this.currentTab === 'ram') {
                    this.allParts = this.allRAM;
                    this.setActiveManufacturer('rams');
                }
            } else {
                console.error('Failed to load RAM:', response.status);
                this.showError();
            }
        } catch (error) {
            console.error('Error loading RAM:', error);
            this.showError();
        } finally {
            this.hideLoading();
        }
    }

    async loadAllPSUs() {
        this.showLoading();
        try {
            const response = await fetch('/api/parts/psus');
            if (response.ok) {
                const allPSUs = await response.json();
                // Filter out PSUs that don't have complete information
                this.allPSUs = allPSUs.filter(psu =>
                    psu.wattage && psu.certification && psu.modularity
                );
                console.log('Loaded PSUs:', this.allPSUs.length, `(filtered out ${allPSUs.length - this.allPSUs.length} incomplete)`);
                this.refreshModalIfOpen('psu');
                this.populatePsuSelector();
                if (this.currentTab === 'psu') {
                    this.allParts = this.allPSUs;
                    this.setActiveManufacturer('psus');
                }
            } else {
                console.error('Failed to load PSUs:', response.status);
                this.showError();
            }
        } catch (error) {
            console.error('Error loading PSUs:', error);
            this.showError();
        } finally {
            this.hideLoading();
        }
    }

    async loadAllCoolers() {
        this.showLoading();
        try {
            const response = await fetch('/api/parts/coolers');
            if (response.ok) {
                this.allCoolers = await response.json();
                console.log('Loaded Coolers:', this.allCoolers.length);
                this.refreshModalIfOpen('cooler');
                this.populateCoolerSelector();
                if (this.currentTab === 'cooler') {
                    this.allParts = this.allCoolers;
                    this.setActiveManufacturer('coolers');
                }
            } else {
                console.error('Failed to load Coolers:', response.status);
                this.showError();
            }
        } catch (error) {
            console.error('Error loading Coolers:', error);
            this.showError();
        } finally {
            this.hideLoading();
        }
    }

    async loadAllStorage() {
        try {
            const response = await fetch('/api/parts/storages');
            if (response.ok) {
                const data = await response.json();

                // Filter out storage with $0 base price
                const filteredData = data.filter(storage => {
                    const basePrice = parseFloat(storage.basePrice) || parseFloat(storage.price) || 0;
                    return basePrice > 0;
                });

                this.allStorage = filteredData;
                console.log(`Loaded ${filteredData.length} Storage devices from database (filtered out ${data.length - filteredData.length} $0 items)`);
                this.refreshModalIfOpen('storage', 'storage2', 'storage3', 'storage4', 'storage5', 'storage6');
            } else {
                console.error('Failed to load Storage:', response.status);
            }
        } catch (error) {
            console.error('Error loading Storage:', error);
        }
    }

    async loadAllCases() {
        try {
            const response = await fetch('/api/parts/cases');
            if (response.ok) {
                const data = await response.json();

                // Filter out cases with $0 base price
                const filteredData = data.filter(caseItem => {
                    const basePrice = parseFloat(caseItem.basePrice) || parseFloat(caseItem.price) || 0;
                    return basePrice > 0;
                });

                this.allCases = filteredData;
                console.log(`Loaded ${filteredData.length} Cases from database (filtered out ${data.length - filteredData.length} $0 items)`);
                this.refreshModalIfOpen('case');
            } else {
                console.error('Failed to load Cases:', response.status);
            }
        } catch (error) {
            console.error('Error loading Cases:', error);
        }
    }

    async loadAllAddons() {
        try {
            const response = await fetch('/api/parts/addons');
            if (response.ok) {
                const data = await response.json();

                // Filter out addons with $0 base price
                const filteredData = data.filter(addon => {
                    const basePrice = parseFloat(addon.basePrice) || parseFloat(addon.price) || 0;
                    return basePrice > 0;
                });

                this.allAddons = filteredData;
                console.log(`Loaded ${filteredData.length} Add-ons from database (filtered out ${data.length - filteredData.length} $0 items)`);
                this.refreshModalIfOpen('addon', 'addon2', 'addon3', 'addon4', 'addon5', 'addon6');
            } else {
                console.error('Failed to load Add-ons:', response.status);
            }
        } catch (error) {
            console.error('Error loading Add-ons:', error);
        }
    }

    async loadAllGPUs() {
        this.showLoading();
        this.hideError();
        
        try {
            const gpus = await this.fetchAllGPUs();
            this.allGPUs = gpus;
            this.filteredGPUs = gpus;
            this.refreshModalIfOpen('gpu', 'gpu2', 'gpu3', 'gpu4');

            this.populateManufacturerFilter();
            this.populateGpuSelector();
            this.updateStats();
            this.renderGPUs();
            this.hideLoading();
            
        } catch (error) {
            console.error('Error loading GPUs:', error);
            this.showError();
            this.hideLoading();
        }
    }

    async fetchAllGPUs() {
        try {
            const response = await fetch('/api/parts/gpus');
            if (!response.ok) {
                throw new Error(`Failed to fetch GPUs: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();

            // Filter out GPUs with $0 base price
            const filteredData = data.filter(gpu => {
                const basePrice = parseFloat(gpu.basePrice) || 0;
                return basePrice > 0;
            });

            console.log(`Loaded ${filteredData.length} GPUs from database (filtered out ${data.length - filteredData.length} $0 cards)`);
            return filteredData;
        } catch (error) {
            console.error('Error fetching GPUs from API:', error);
            throw error; // Don't fall back to sample data, show the error
        }
    }


    setActiveManufacturer(manufacturer) {
        // Handle different category types
        if (manufacturer === 'gpus' || manufacturer === 'cpus' || manufacturer === 'motherboards' || manufacturer === 'rams' || manufacturer === 'psus' || manufacturer === 'coolers') {
            this.currentManufacturer = '';
            this.currentCategory = manufacturer;
        } else if (manufacturer === 'intel-cpu' || manufacturer === 'amd-cpu') {
            this.currentManufacturer = manufacturer.replace('-cpu', '').toUpperCase();
            this.currentCategory = 'cpus';
        } else if (manufacturer === 'intel-mb' || manufacturer === 'amd-mb') {
            this.currentManufacturer = manufacturer.replace('-mb', '').toUpperCase();
            this.currentCategory = 'motherboards';
        } else if (manufacturer === 'flagship' || manufacturer === 'mainstream') {
            this.currentManufacturer = manufacturer;
            this.currentCategory = 'cpus';
        } else if (manufacturer === 'atx' || manufacturer === 'micro-atx' || manufacturer === 'mini-itx') {
            this.currentManufacturer = manufacturer;
            this.currentCategory = 'motherboards';
        } else if (manufacturer === 'ddr5' || manufacturer === 'ddr4' || manufacturer === 'high-speed' || manufacturer === 'rgb-ram' || manufacturer === '32gb-kit') {
            this.currentManufacturer = manufacturer;
            this.currentCategory = 'rams';
        } else if (manufacturer === 'high-wattage' || manufacturer === 'modular' || manufacturer === '80plus-gold' || manufacturer === '80plus-platinum' || manufacturer === 'sfx') {
            this.currentManufacturer = manufacturer;
            this.currentCategory = 'psus';
        } else if (manufacturer === 'air-cooler' || manufacturer === 'liquid-cooler' || manufacturer === 'high-end-cooler' || manufacturer === 'rgb-cooler' || manufacturer === 'low-profile') {
            this.currentManufacturer = manufacturer;
            this.currentCategory = 'coolers';
        } else {
            this.currentManufacturer = manufacturer.toUpperCase();
        }
        
        // Update active button within current tab
        const currentTabElement = document.querySelector(`#${this.currentTab}-tab`);
        currentTabElement.querySelectorAll('.nav-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        const activeBtn = currentTabElement.querySelector(`[data-category="${manufacturer}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        // Filter parts by manufacturer
        if (this.currentTab === 'gpu') {
            this.filterGPUsByManufacturer();
        } else if (this.currentTab === 'cpu') {
            this.filterCPUsByCategory();
        } else if (this.currentTab === 'motherboard') {
            this.filterMotherboardsByCategory();
        } else if (this.currentTab === 'ram') {
            this.filterRAMByCategory();
        } else if (this.currentTab === 'psu') {
            this.filterPSUsByCategory();
        } else if (this.currentTab === 'cooler') {
            this.filterCoolersByCategory();
        }
        this.updateStats();
        this.renderParts();
    }

    filterGPUsByManufacturer() {
        if (this.currentManufacturer === '') {
            this.filteredGPUs = this.allGPUs;
        } else {
            this.filteredGPUs = this.allGPUs.filter(gpu => 
                gpu.manufacturer && gpu.manufacturer.toUpperCase() === this.currentManufacturer
            );
        }
        
        this.applyFilters();
    }

    filterCPUsByCategory() {
        if (this.currentCategory === 'cpus' && this.currentManufacturer === '') {
            this.filteredParts = this.allCPUs;
        } else if (this.currentManufacturer === 'INTEL' || this.currentManufacturer === 'AMD') {
            this.filteredParts = this.allCPUs.filter(cpu => 
                cpu.manufacturer && cpu.manufacturer.toUpperCase() === this.currentManufacturer
            );
        } else if (this.currentManufacturer === 'flagship' || this.currentManufacturer === 'mainstream') {
            this.filteredParts = this.allCPUs.filter(cpu => 
                cpu.performanceTier && cpu.performanceTier.toLowerCase().includes(this.currentManufacturer)
            );
        } else {
            this.filteredParts = this.allCPUs;
        }
        
        this.applyCPUFilters();
    }

    filterMotherboardsByCategory() {
        if (this.currentCategory === 'motherboards' && this.currentManufacturer === '') {
            this.filteredParts = this.allMotherboards;
        } else if (this.currentManufacturer === 'INTEL' || this.currentManufacturer === 'AMD') {
            this.filteredParts = this.allMotherboards.filter(motherboard => 
                motherboard.manufacturer && motherboard.manufacturer.toUpperCase() === this.currentManufacturer
            );
        } else if (this.currentManufacturer === 'atx' || this.currentManufacturer === 'micro-atx' || this.currentManufacturer === 'mini-itx') {
            this.filteredParts = this.allMotherboards.filter(motherboard => 
                motherboard.formFactor && motherboard.formFactor.toLowerCase().replace(/\s+/g, '-') === this.currentManufacturer
            );
        } else {
            this.filteredParts = this.allMotherboards;
        }
        
        this.applyMotherboardFilters();
    }

    filterRAMByCategory() {
        if (this.currentCategory === 'rams' && this.currentManufacturer === '') {
            this.filteredParts = this.allRAM;
        } else if (this.currentManufacturer === 'ddr5' || this.currentManufacturer === 'ddr4') {
            this.filteredParts = this.allRAM.filter(ram => 
                ram.memoryType && ram.memoryType.toLowerCase() === this.currentManufacturer
            );
        } else if (this.currentManufacturer === 'high-speed') {
            this.filteredParts = this.allRAM.filter(ram => {
                if (!ram.speed) return false;
                const speed = parseInt(ram.speed);
                return (ram.memoryType === 'DDR5' && speed >= 6000) ||
                       (ram.memoryType === 'DDR4' && speed >= 3600);
            });
        } else if (this.currentManufacturer === 'rgb-ram') {
            this.filteredParts = this.allRAM.filter(ram =>
                ram.specifications && ram.specifications.rgb
            );
        } else if (this.currentManufacturer === '32gb-kit') {
            this.filteredParts = this.allRAM.filter(ram =>
                ram.totalCapacity && ram.totalCapacity >= 32
            );
        } else {
            this.filteredParts = this.allRAM;
        }
        
        this.applyRAMFilters();
    }

    filterPSUsByCategory() {
        if (this.currentCategory === 'psus' && this.currentManufacturer === '') {
            this.filteredParts = this.allPSUs;
        } else if (this.currentManufacturer === 'high-wattage') {
            this.filteredParts = this.allPSUs.filter(psu => 
                psu.wattage && psu.wattage >= 750
            );
        } else if (this.currentManufacturer === 'modular') {
            this.filteredParts = this.allPSUs.filter(psu => 
                psu.modularity && (psu.modularity.includes('modular') || psu.modularity.includes('Modular'))
            );
        } else if (this.currentManufacturer === '80plus-gold') {
            this.filteredParts = this.allPSUs.filter(psu => 
                psu.certification && psu.certification.toLowerCase().includes('gold')
            );
        } else if (this.currentManufacturer === '80plus-platinum') {
            this.filteredParts = this.allPSUs.filter(psu => 
                psu.certification && psu.certification.toLowerCase().includes('platinum')
            );
        } else if (this.currentManufacturer === 'sfx') {
            this.filteredParts = this.allPSUs.filter(psu => 
                psu.formFactor && (psu.formFactor.toLowerCase().includes('sfx') || psu.formFactor.toLowerCase() === 'sfx-l')
            );
        } else {
            this.filteredParts = this.allPSUs;
        }
        
        this.applyPSUFilters();
    }

    filterCoolersByCategory() {
        if (this.currentCategory === 'coolers' && this.currentManufacturer === '') {
            this.filteredParts = this.allCoolers;
        } else if (this.currentManufacturer === 'air-cooler') {
            this.filteredParts = this.allCoolers.filter(cooler => 
                cooler.coolerType && cooler.coolerType.toLowerCase().includes('air')
            );
        } else if (this.currentManufacturer === 'liquid-cooler') {
            this.filteredParts = this.allCoolers.filter(cooler => 
                cooler.coolerType && (cooler.coolerType.toLowerCase().includes('liquid') || cooler.coolerType.toLowerCase().includes('aio'))
            );
        } else if (this.currentManufacturer === 'high-end-cooler') {
            this.filteredParts = this.allCoolers.filter(cooler => 
                cooler.performanceTier && cooler.performanceTier.toLowerCase().includes('high-end')
            );
        } else if (this.currentManufacturer === 'rgb-cooler') {
            this.filteredParts = this.allCoolers.filter(cooler => 
                (cooler.specifications && cooler.specifications.rgb) || 
                (cooler.title && cooler.title.toLowerCase().includes('rgb'))
            );
        } else if (this.currentManufacturer === 'low-profile') {
            this.filteredParts = this.allCoolers.filter(cooler => 
                cooler.performanceTier && cooler.performanceTier.toLowerCase().includes('low profile')
            );
        } else {
            this.filteredParts = this.allCoolers;
        }
        
        this.applyCoolerFilters();
    }

    performSearch() {
        const query = document.getElementById('searchInput').value.toLowerCase().trim();
        
        if (query === '') {
            if (this.currentTab === 'gpu') {
                this.filterGPUsByManufacturer();
            } else if (this.currentTab === 'cpu') {
                this.filterCPUsByCategory();
            } else if (this.currentTab === 'motherboard') {
                this.filterMotherboardsByCategory();
            } else if (this.currentTab === 'ram') {
                this.filterRAMByCategory();
            }
        } else {
            if (this.currentTab === 'gpu') {
                this.filteredGPUs = this.allGPUs.filter(gpu => {
                    return (gpu.title && gpu.title.toLowerCase().includes(query)) ||
                           (gpu.manufacturer && gpu.manufacturer.toLowerCase().includes(query)) ||
                           (gpu.gpuModel && gpu.gpuModel.toLowerCase().includes(query));
                });
                this.applyFilters();
            } else if (this.currentTab === 'cpu') {
                this.filteredParts = this.allCPUs.filter(cpu => {
                    return (cpu.title && cpu.title.toLowerCase().includes(query)) ||
                           (cpu.manufacturer && cpu.manufacturer.toLowerCase().includes(query)) ||
                           (cpu.model && cpu.model.toLowerCase().includes(query));
                });
                this.applyCPUFilters();
            } else if (this.currentTab === 'motherboard') {
                this.filteredParts = this.allMotherboards.filter(motherboard => {
                    return (motherboard.title && motherboard.title.toLowerCase().includes(query)) ||
                           (motherboard.manufacturer && motherboard.manufacturer.toLowerCase().includes(query)) ||
                           (motherboard.model && motherboard.model.toLowerCase().includes(query)) ||
                           (motherboard.chipset && motherboard.chipset.toLowerCase().includes(query));
                });
                this.applyMotherboardFilters();
            } else if (this.currentTab === 'ram') {
                this.filteredParts = this.allRAM.filter(ram => {
                    return (ram.title && ram.title.toLowerCase().includes(query)) ||
                           (ram.manufacturer && ram.manufacturer.toLowerCase().includes(query)) ||
                           (ram.memoryType && ram.memoryType.toLowerCase().includes(query)) ||
                           (ram.speed != null && String(ram.speed).toLowerCase().includes(query)) ||
                           (ram.totalCapacity != null && String(ram.totalCapacity).toLowerCase().includes(query)) ||
                           (ram.kitConfiguration && ram.kitConfiguration.toLowerCase().includes(query));
                });
                this.applyRAMFilters();
            } else if (this.currentTab === 'psu') {
                this.filteredParts = this.allPSUs.filter(psu => {
                    return (psu.title && psu.title.toLowerCase().includes(query)) ||
                           (psu.name && psu.name.toLowerCase().includes(query)) ||
                           (psu.manufacturer && psu.manufacturer.toLowerCase().includes(query)) ||
                           (psu.brand && psu.brand.toLowerCase().includes(query)) ||
                           (psu.certification && psu.certification.toLowerCase().includes(query)) ||
                           (psu.modularity && psu.modularity.toLowerCase().includes(query));
                });
                this.applyPSUFilters();
            }
        }
        
        this.updateStats();
        this.renderParts();
    }

    applyFilters() {
        let filtered = [...this.filteredGPUs];
        
        // Manufacturer filter
        const manufacturerFilter = document.getElementById('manufacturerFilter').value;
        if (manufacturerFilter) {
            filtered = filtered.filter(gpu => gpu.manufacturer === manufacturerFilter);
        }
        
        // Price filter
        const priceFilter = document.getElementById('priceFilter').value;
        if (priceFilter) {
            filtered = filtered.filter(gpu => {
                const price = parseFloat(gpu.currentPrice || gpu.salePrice || gpu.basePrice || gpu.price) || 0;
                switch (priceFilter) {
                    case '0-200':
                        return price <= 200;
                    case '200-400':
                        return price > 200 && price <= 400;
                    case '400-600':
                        return price > 400 && price <= 600;
                    case '600-800':
                        return price > 600 && price <= 800;
                    case '800-1000':
                        return price > 800 && price <= 1000;
                    case '1000-1500':
                        return price > 1000 && price <= 1500;
                    case '1500':
                        return price > 1500;
                    default:
                        return true;
                }
            });
        }
        
        this.filteredGPUs = filtered;
        this.renderParts();
    }

    applyCPUFilters() {
        let filtered = [...this.filteredParts];
        
        // Manufacturer filter
        const manufacturerFilter = document.getElementById('manufacturerFilter').value;
        if (manufacturerFilter) {
            filtered = filtered.filter(cpu => 
                cpu.manufacturer && cpu.manufacturer.toUpperCase() === manufacturerFilter.toUpperCase()
            );
        }
        
        // Price filter
        const priceFilter = document.getElementById('priceFilter').value;
        if (priceFilter) {
            filtered = filtered.filter(cpu => {
                if (!cpu.currentPrice) return false;
                
                if (priceFilter === '1000+') {
                    return cpu.currentPrice >= 1000;
                } else {
                    const [min, max] = priceFilter.split('-').map(Number);
                    return cpu.currentPrice >= min && cpu.currentPrice <= max;
                }
            });
        }
        
        this.filteredParts = filtered;
        this.renderParts();
    }

    applyMotherboardFilters() {
        let filtered = [...this.filteredParts];
        
        // Manufacturer filter
        const manufacturerFilter = document.getElementById('manufacturerFilter').value;
        if (manufacturerFilter) {
            filtered = filtered.filter(motherboard => 
                motherboard.manufacturer && motherboard.manufacturer.toUpperCase() === manufacturerFilter.toUpperCase()
            );
        }
        
        // Price filter
        const priceFilter = document.getElementById('priceFilter').value;
        if (priceFilter) {
            filtered = filtered.filter(motherboard => {
                if (!motherboard.currentPrice) return false;
                
                if (priceFilter === '1000+') {
                    return motherboard.currentPrice >= 1000;
                } else {
                    const [min, max] = priceFilter.split('-').map(Number);
                    return motherboard.currentPrice >= min && motherboard.currentPrice <= max;
                }
            });
        }
        
        this.filteredParts = filtered;
        this.renderParts();
    }

    applyRAMFilters() {
        let filtered = [...this.filteredParts];
        
        // Manufacturer filter
        const manufacturerFilter = document.getElementById('manufacturerFilter').value;
        if (manufacturerFilter) {
            filtered = filtered.filter(ram => 
                ram.manufacturer && ram.manufacturer.toUpperCase() === manufacturerFilter.toUpperCase()
            );
        }
        
        // Price filter
        const priceFilter = document.getElementById('priceFilter').value;
        if (priceFilter) {
            filtered = filtered.filter(ram => {
                if (!ram.currentPrice) return false;
                
                if (priceFilter === '1000+') {
                    return ram.currentPrice >= 1000;
                } else {
                    const [min, max] = priceFilter.split('-').map(Number);
                    return ram.currentPrice >= min && ram.currentPrice <= max;
                }
            });
        }
        
        this.filteredParts = filtered;
        this.renderParts();
    }

    applyPSUFilters() {
        let filtered = [...this.filteredParts];
        
        // Manufacturer filter
        const manufacturerFilter = document.getElementById('manufacturerFilter').value;
        if (manufacturerFilter) {
            filtered = filtered.filter(psu => 
                (psu.manufacturer && psu.manufacturer.toUpperCase() === manufacturerFilter.toUpperCase()) ||
                (psu.brand && psu.brand.toUpperCase() === manufacturerFilter.toUpperCase())
            );
        }
        
        // Price filter
        const priceFilter = document.getElementById('priceFilter').value;
        if (priceFilter) {
            filtered = filtered.filter(psu => {
                if (!psu.price) return false;
                
                if (priceFilter === '1000+') {
                    return psu.price >= 1000;
                } else {
                    const [min, max] = priceFilter.split('-').map(Number);
                    return psu.price >= min && psu.price <= max;
                }
            });
        }
        
        this.filteredParts = filtered;
        this.renderParts();
    }

    applyCoolerFilters() {
        let filtered = [...this.filteredParts];
        
        // Manufacturer filter
        const manufacturerFilter = document.getElementById('manufacturerFilter').value;
        if (manufacturerFilter) {
            filtered = filtered.filter(cooler => 
                (cooler.manufacturer && cooler.manufacturer.toUpperCase() === manufacturerFilter.toUpperCase()) ||
                (cooler.brand && cooler.brand.toUpperCase() === manufacturerFilter.toUpperCase())
            );
        }
        
        // Price filter
        const priceFilter = document.getElementById('priceFilter').value;
        if (priceFilter) {
            filtered = filtered.filter(cooler => {
                const price = parseFloat(cooler.currentPrice || cooler.salePrice || cooler.basePrice || cooler.price) || 0;
                if (price === 0) return false;
                
                if (priceFilter === '1000+') {
                    return price >= 1000;
                } else {
                    const [min, max] = priceFilter.split('-').map(Number);
                    return price >= min && price <= max;
                }
            });
        }
        
        this.filteredParts = filtered;
        this.renderParts();
    }

    clearAllFilters() {
        document.getElementById('manufacturerFilter').value = '';
        document.getElementById('priceFilter').value = '';
        document.getElementById('searchInput').value = '';
        this.filterGPUsByManufacturer();
    }

    async populateManufacturerFilter() {
        const manufacturerFilter = document.getElementById('manufacturerFilter');
        if (!manufacturerFilter) {
            // Filter element doesn't exist in current UI, skip
            return;
        }

        try {
            const response = await fetch('/api/manufacturers');
            if (response.ok) {
                const manufacturers = await response.json();
                const gpuManufacturers = manufacturers.filter(m => ['NVIDIA', 'AMD', 'Intel'].includes(m));
                gpuManufacturers.forEach(manufacturer => {
                    const option = document.createElement('option');
                    option.value = manufacturer;
                    option.textContent = manufacturer;
                    manufacturerFilter.appendChild(option);
                });

                const totalManufacturers = document.getElementById('totalManufacturers');
                if (totalManufacturers) {
                    totalManufacturers.textContent = gpuManufacturers.length;
                }
            }
        } catch (error) {
            console.error('Error fetching manufacturers:', error);
            // Fallback to extracting from loaded GPUs
            if (this.allGPUs && Array.isArray(this.allGPUs) && manufacturerFilter) {
                const manufacturers = [...new Set(this.allGPUs.map(gpu => gpu.manufacturer).filter(Boolean))];
                manufacturers.forEach(manufacturer => {
                    const option = document.createElement('option');
                    option.value = manufacturer;
                    option.textContent = manufacturer;
                    manufacturerFilter.appendChild(option);
                });

                const totalManufacturers = document.getElementById('totalManufacturers');
                if (totalManufacturers) {
                    totalManufacturers.textContent = manufacturers.length;
                }
            }
        }
    }

    renderParts() {
        // Don't render parts grid on the builder tab
        if (this.currentTab === 'builder') {
            const partsGrid = document.getElementById('partsGrid');
            partsGrid.innerHTML = '';
            document.getElementById('noResults').classList.add('hidden');
            return;
        }

        const partsGrid = document.getElementById('partsGrid');
        partsGrid.innerHTML = '';

        // Force single column on mobile
        const isMobile = window.innerWidth <= 1200;
        console.log(`Mobile detection: width=${window.innerWidth}, isMobile=${isMobile}`);
        if (isMobile) {
            partsGrid.style.setProperty('grid-template-columns', '1fr', 'important');
            partsGrid.classList.add('mobile-single-column');
            console.log('Applied single column grid to mobile (with !important)');
        } else {
            partsGrid.style.gridTemplateColumns = '';
            partsGrid.classList.remove('mobile-single-column');
        }

        const currentParts = this.currentTab === 'gpu' ? this.filteredGPUs : this.filteredParts;

        if (currentParts.length === 0) {
            document.getElementById('noResults').classList.remove('hidden');
            return;
        }

        document.getElementById('noResults').classList.add('hidden');

        currentParts.forEach(part => {
            if (this.currentTab === 'gpu') {
                const gpuCard = this.createGPUCard(part);
                partsGrid.appendChild(gpuCard);
            } else if (this.currentTab === 'cpu') {
                const cpuCard = this.createCPUCard(part);
                partsGrid.appendChild(cpuCard);
            } else if (this.currentTab === 'motherboard') {
                const motherboardCard = this.createMotherboardCard(part);
                partsGrid.appendChild(motherboardCard);
            } else if (this.currentTab === 'ram') {
                const ramCard = this.createRAMCard(part);
                partsGrid.appendChild(ramCard);
            } else if (this.currentTab === 'psu') {
                const psuCard = this.createPSUCard(part);
                partsGrid.appendChild(psuCard);
            } else if (this.currentTab === 'cooler') {
                const coolerCard = this.createCoolerCard(part);
                partsGrid.appendChild(coolerCard);
            }
        });

        // Re-apply mobile grid after parts are rendered
        if (isMobile) {
            setTimeout(() => {
                partsGrid.style.setProperty('grid-template-columns', '1fr', 'important');
                partsGrid.classList.add('mobile-single-column');
                console.log('✓ Re-applied single column grid after parts rendered (with !important)');
            }, 100);
        }
    }

    renderGPUs() {
        // Legacy method - redirect to renderParts for compatibility
        this.renderParts();
    }

    createGPUCard(gpu) {
        const card = document.createElement('div');
        card.className = 'part-card';
        card.dataset.componentId = gpu._id || gpu.title || gpu.name;

        // Handle different price formats in the data
        let price = gpu.currentPrice || gpu.salePrice || gpu.basePrice || gpu.price || 0;
        price = parseFloat(price) || 0;
        
        let priceDisplay = 'Price N/A';
        if (price > 0) {
            priceDisplay = `$${price.toFixed(2)}`;
            
            // Show discount if on sale
            if (gpu.isOnSale && gpu.basePrice && gpu.salePrice) {
                const basePrice = parseFloat(gpu.basePrice);
                const salePrice = parseFloat(gpu.salePrice);
                if (basePrice > salePrice) {
                    const discountPercent = Math.round(((basePrice - salePrice) / basePrice) * 100);
                    priceDisplay = `
                        <span class="sale-price">$${salePrice.toFixed(2)}</span>
                        <span class="original-price">$${basePrice.toFixed(2)}</span>
                        <span class="discount">-${discountPercent}%</span>
                    `;
                }
            }
        }
        
        // Get manufacturer badge class for styling
        const manufacturerClass = this.getManufacturerClass(gpu.manufacturer);
        
        // Extract card manufacturer from title (MSI, GIGABYTE, PNY, etc.)
        const cardBrand = this.extractCardBrand(gpu.title || gpu.name || '');
        const cardBrandClass = this.getCardBrandClass(cardBrand);
        
        card.innerHTML = `
            <div class="part-header">
                <div class="part-title-section">
                    <div class="manufacturer-badges">
                        <div class="manufacturer-badge ${manufacturerClass}">${gpu.manufacturer || 'Unknown'}</div>
                        ${cardBrand ? `<div class="card-brand-badge ${cardBrandClass}">${cardBrand}</div>` : ''}
                    </div>
                    <div class="part-title">${gpu.title || gpu.name || 'Unknown GPU'}</div>
                </div>
                <div class="part-price">${priceDisplay}</div>
            </div>
            <div class="part-specs">
                <div class="spec-row">
                    <span class="spec-label">Model:</span>
                    <span class="spec-value">${gpu.chipset || gpu.gpuModel || 'N/A'}</span>
                </div>
                <div class="spec-row">
                    <span class="spec-label">Memory:</span>
                    <span class="spec-value">${gpu.memory && gpu.memory.size ? `${gpu.memory.size}GB ${gpu.memory.type || 'GDDR'}` : 'N/A'}</span>
                </div>
                <div class="spec-row">
                    <span class="spec-label">Source:</span>
                    <span class="spec-value">${gpu.source || 'Database'}</span>
                </div>
                ${gpu.updatedAt || gpu.lastUpdated ? `
                <div class="spec-row">
                    <span class="spec-label">Updated:</span>
                    <span class="spec-value">${new Date(gpu.updatedAt || gpu.lastUpdated).toLocaleDateString()}</span>
                </div>
                ` : ''}
            </div>
            ${gpu.features && gpu.features.length > 0 ? `
            <div class="part-features">
                ${gpu.features.map(feature => `
                    <span class="feature-tag">${feature}</span>
                `).join('')}
            </div>
            ` : ''}
            ${gpu.sourceUrl || gpu.url ? `
            <a href="${gpu.sourceUrl || gpu.url}" target="_blank" class="part-link">
                <i class="fas fa-external-link-alt"></i>
                View on Amazon
            </a>
            ` : ''}
        `;
        
        return card;
    }

    createCPUCard(cpu) {
        const card = document.createElement('div');
        card.className = 'part-card';
        
        const title = cpu.title || cpu.name || 'Unknown CPU';
        const price = cpu.currentPrice || cpu.price;
        const specs = cpu.specifications || {};
        
        card.innerHTML = `
            <div class="part-card-header">
                <div class="part-info">
                    <h3 class="part-title">${title}</h3>
                    <p class="part-manufacturer ${this.getManufacturerClass(cpu.manufacturer)}">${cpu.manufacturer || 'Unknown'}</p>
                </div>
                <div class="part-price">
                    <span class="current-price">$${price ? price.toFixed(2) : 'N/A'}</span>
                </div>
            </div>
            <div class="part-details">
                <div class="specs-grid">
                    ${specs.cores ? `<div class="spec"><span class="spec-label">Cores:</span> <span class="spec-value">${specs.cores}</span></div>` : ''}
                    ${specs.threads ? `<div class="spec"><span class="spec-label">Threads:</span> <span class="spec-value">${specs.threads}</span></div>` : ''}
                    ${specs.baseClock ? `<div class="spec"><span class="spec-label">Base Clock:</span> <span class="spec-value">${specs.baseClock}GHz</span></div>` : ''}
                    ${specs.boostClock ? `<div class="spec"><span class="spec-label">Boost Clock:</span> <span class="spec-value">${specs.boostClock}GHz</span></div>` : ''}
                    ${cpu.socket ? `<div class="spec"><span class="spec-label">Socket:</span> <span class="spec-value">${cpu.socket}</span></div>` : ''}
                    ${specs.tdp ? `<div class="spec"><span class="spec-label">TDP:</span> <span class="spec-value">${specs.tdp}W</span></div>` : ''}
                    ${cpu.releaseYear ? `<div class="spec"><span class="spec-label">Release:</span> <span class="spec-value">${cpu.releaseYear}</span></div>` : ''}
                    ${cpu.singleThreadScore ? `<div class="spec"><span class="spec-label">Single Thread:</span> <span class="spec-value">${cpu.singleThreadScore}%</span></div>` : ''}
                    ${cpu.multiThreadScore ? `<div class="spec"><span class="spec-label">Multi Thread:</span> <span class="spec-value">${cpu.multiThreadScore}%</span></div>` : ''}
                </div>
            </div>
            <div class="part-card-footer">
                <span class="part-source">${cpu.source || 'Unknown'}</span>
                ${cpu.sourceUrl ? `<a href="${cpu.sourceUrl}" target="_blank" class="part-link">View Details</a>` : ''}
            </div>
        `;
        
        return card;
    }

    createCoolerCard(cooler) {
        const card = document.createElement('div');
        card.className = 'part-card';
        
        const title = cooler.title || cooler.name || 'Unknown Cooler';
        
        // Handle price display with sale price support (same logic as GPUs)
        let price = cooler.currentPrice || cooler.salePrice || cooler.basePrice || cooler.price || 0;
        price = parseFloat(price) || 0;
        
        let priceDisplay = 'Price N/A';
        if (price > 0) {
            priceDisplay = `<span class="current-price">$${price.toFixed(2)}</span>`;
            
            // Check for sale pricing (same logic as GPU cards)
            if (cooler.isOnSale && cooler.basePrice && cooler.salePrice) {
                const basePrice = parseFloat(cooler.basePrice);
                const salePrice = parseFloat(cooler.salePrice);
                if (basePrice > salePrice) {
                    const discountPercent = Math.round(((basePrice - salePrice) / basePrice) * 100);
                    priceDisplay = `
                        <span class="sale-price">$${salePrice.toFixed(2)}</span>
                        <span class="original-price">$${basePrice.toFixed(2)}</span>
                        <span class="discount">-${discountPercent}%</span>
                    `;
                }
            }
        }
        
        // Get brand/manufacturer for display
        const brand = cooler.brand || cooler.manufacturer || 'Unknown';
        
        // Format cooler type display
        let coolerTypeDisplay = cooler.coolerType || 'Unknown';
        
        // Format RGB status
        let rgbDisplay = '';
        if (cooler.specifications && cooler.specifications.rgb) {
            rgbDisplay = 'RGB';
        } else if (cooler.title && cooler.title.toLowerCase().includes('rgb')) {
            rgbDisplay = 'RGB';
        }
        
        // Socket compatibility
        let socketDisplay = '';
        if (cooler.socketCompatibility && cooler.socketCompatibility.length > 0) {
            socketDisplay = cooler.socketCompatibility.join(', ');
        } else if (cooler.specifications && cooler.specifications.socketCompatibility && cooler.specifications.socketCompatibility.length > 0) {
            socketDisplay = cooler.specifications.socketCompatibility.join(', ');
        }
        
        card.innerHTML = `
            <div class="part-card-header">
                <div class="part-info">
                    <h3 class="part-title">${title}</h3>
                    <p class="part-manufacturer ${this.getManufacturerClass(brand)}">${brand}</p>
                </div>
                <div class="part-price">
                    ${priceDisplay}
                </div>
            </div>
            <div class="part-details">
                <div class="specs-grid">
                    ${coolerTypeDisplay ? `<div class="spec"><span class="spec-label">Type:</span> <span class="spec-value spec-feature">${coolerTypeDisplay}</span></div>` : ''}
                    ${cooler.radiatorSize ? `<div class="spec"><span class="spec-label">Radiator:</span> <span class="spec-value">${cooler.radiatorSize}</span></div>` : ''}
                    ${cooler.fanSize ? `<div class="spec"><span class="spec-label">Fan Size:</span> <span class="spec-value">${cooler.fanSize}</span></div>` : ''}
                    ${cooler.performanceTier ? `<div class="spec"><span class="spec-label">Tier:</span> <span class="spec-value">${cooler.performanceTier}</span></div>` : ''}
                    ${socketDisplay ? `<div class="spec"><span class="spec-label">Sockets:</span> <span class="spec-value">${socketDisplay}</span></div>` : ''}
                    ${rgbDisplay ? `<div class="spec"><span class="spec-label">Lighting:</span> <span class="spec-value spec-feature">${rgbDisplay}</span></div>` : ''}
                </div>
            </div>
            <div class="part-card-footer">
                <span class="part-source">${cooler.source || 'Unknown'}</span>
                ${this.createCoolerSearchLink(cooler)}
            </div>
        `;
        
        return card;
    }

    createCoolerSearchLink(cooler) {
        // Use direct URLs like other components (GPUs, CPUs, etc.)
        if (cooler.sourceUrl || cooler.url) {
            return `<a href="${cooler.sourceUrl || cooler.url}" target="_blank" class="part-link">
                <i class="fas fa-external-link-alt"></i>
                View on Amazon
            </a>`;
        }
        return '';
    }

    createMotherboardCard(motherboard) {
        const card = document.createElement('div');
        card.className = 'part-card';

        const title = motherboard.title || motherboard.name || 'Unknown Motherboard';
        const specs = motherboard.specifications || {};

        // Check CPU compatibility
        let isCompatible = true;
        let compatibilityMessage = '';
        let biosWarningIcon = '';

        if (this.currentBuild && this.currentBuild.cpu) {
            const selectedCpu = this.currentBuild.cpu;
            const cpuChipsets = selectedCpu.supportedChipsets || [];
            const motherboardChipset = motherboard.chipset;

            if (cpuChipsets.length > 0 && motherboardChipset) {
                isCompatible = cpuChipsets.includes(motherboardChipset);

                if (!isCompatible) {
                    card.classList.add('incompatible');
                    compatibilityMessage = `<div class="incompatibility-notice">⚠️ Not compatible with selected CPU (${selectedCpu.name || selectedCpu.title})</div>`;
                } else {
                    // Check if BIOS update is required
                    const biosUpdateChipsets = selectedCpu.biosUpdateRequired || [];
                    if (biosUpdateChipsets.includes(motherboardChipset)) {
                        biosWarningIcon = `<span class="bios-warning-icon" title="BIOS update may be required">⚠️</span>`;
                    }
                }
            }
        }

        // Handle price display with sale price support (same logic as GPU, PSU, and RAM cards)
        let price = motherboard.currentPrice || motherboard.salePrice || motherboard.basePrice || motherboard.price || 0;
        price = parseFloat(price) || 0;

        let priceDisplay = 'Price N/A';
        if (price > 0) {
            priceDisplay = `<span class="current-price">$${price.toFixed(2)}</span>`;

            // Check for sale pricing
            if (motherboard.isOnSale && motherboard.basePrice && motherboard.salePrice) {
                const basePrice = parseFloat(motherboard.basePrice);
                const salePrice = parseFloat(motherboard.salePrice);
                if (basePrice > salePrice) {
                    const discountPercent = Math.round(((basePrice - salePrice) / basePrice) * 100);
                    priceDisplay = `
                        <span class="sale-price">$${salePrice.toFixed(2)}</span>
                        <span class="original-price">$${basePrice.toFixed(2)}</span>
                        <span class="discount">-${discountPercent}%</span>
                    `;
                }
            }
        }

        // Safely handle memoryType - ensure it's an array
        let memoryTypeDisplay = '';
        if (motherboard.memoryType) {
            const memoryArray = Array.isArray(motherboard.memoryType)
                ? motherboard.memoryType
                : [motherboard.memoryType];
            if (memoryArray.length > 0) {
                memoryTypeDisplay = `<div class="spec"><span class="spec-label">Memory:</span> <span class="spec-value">${memoryArray.join(', ')}</span></div>`;
            }
        }

        card.innerHTML = `
            ${compatibilityMessage}
            <div class="part-card-header">
                <div class="part-info">
                    <h3 class="part-title">${title}</h3>
                    <p class="part-manufacturer ${this.getManufacturerClass(motherboard.manufacturer)}">${motherboard.manufacturer || 'Unknown'} ${biosWarningIcon}</p>
                </div>
                <div class="part-price">
                    ${priceDisplay}
                </div>
            </div>
            <div class="part-details">
                <div class="specs-grid">
                    ${motherboard.socket ? `<div class="spec"><span class="spec-label">Socket:</span> <span class="spec-value">${motherboard.socket}</span></div>` : ''}
                    ${motherboard.formFactor ? `<div class="spec"><span class="spec-label">Form Factor:</span> <span class="spec-value">${motherboard.formFactor}</span></div>` : ''}
                    ${memoryTypeDisplay}
                    ${motherboard.maxMemory ? `<div class="spec"><span class="spec-label">Max RAM:</span> <span class="spec-value">${motherboard.maxMemory}GB</span></div>` : ''}
                    ${motherboard.ramSlots ? `<div class="spec"><span class="spec-label">RAM Slots:</span> <span class="spec-value">${motherboard.ramSlots}</span></div>` : ''}
                </div>
            </div>
            <div class="part-card-footer">
                <span class="part-source">${motherboard.source || 'Unknown'}</span>
                ${motherboard.sourceUrl ? `<a href="${motherboard.sourceUrl}" target="_blank" class="part-link">View Details</a>` : ''}
            </div>
        `;

        return card;
    }

    createRAMCard(ram) {
        const card = document.createElement('div');
        card.className = 'part-card';
        
        const title = ram.title || ram.name || 'Unknown RAM';
        const specs = ram.specifications || {};
        
        // Handle price display with sale price support (same logic as GPU and PSU cards)
        let price = ram.currentPrice || ram.salePrice || ram.basePrice || ram.price || 0;
        price = parseFloat(price) || 0;
        
        let priceDisplay = 'Price N/A';
        if (price > 0) {
            priceDisplay = `<span class="current-price">$${price.toFixed(2)}</span>`;
            
            // Check for sale pricing
            if (ram.isOnSale && ram.basePrice && ram.salePrice) {
                const basePrice = parseFloat(ram.basePrice);
                const salePrice = parseFloat(ram.salePrice);
                if (basePrice > salePrice) {
                    const discountPercent = Math.round(((basePrice - salePrice) / basePrice) * 100);
                    priceDisplay = `
                        <span class="sale-price">$${salePrice.toFixed(2)}</span>
                        <span class="original-price">$${basePrice.toFixed(2)}</span>
                        <span class="discount">-${discountPercent}%</span>
                    `;
                }
            }
        }
        
        card.innerHTML = `
            <div class="part-card-header">
                <div class="part-info">
                    <h3 class="part-title">${title}</h3>
                    <p class="part-manufacturer ${this.getManufacturerClass(ram.manufacturer)}">${ram.manufacturer || 'Unknown'}</p>
                </div>
                <div class="part-price">
                    ${priceDisplay}
                </div>
            </div>
            <div class="part-details">
                <div class="specs-grid">
                    ${ram.memoryType ? `<div class="spec"><span class="spec-label">Type:</span> <span class="spec-value">${ram.memoryType}</span></div>` : ''}
                    ${ram.speed ? `<div class="spec"><span class="spec-label">Speed:</span> <span class="spec-value">${ram.speed}</span></div>` : ''}
                    ${ram.capacity ? `<div class="spec"><span class="spec-label">Capacity:</span> <span class="spec-value">${ram.capacity}</span></div>` : ''}
                    ${ram.kitConfiguration ? `<div class="spec"><span class="spec-label">Kit:</span> <span class="spec-value">${ram.kitConfiguration}</span></div>` : ''}
                    ${ram.latency ? `<div class="spec"><span class="spec-label">Latency:</span> <span class="spec-value">${ram.latency}</span></div>` : ''}
                    ${specs.rgb ? `<div class="spec"><span class="spec-label">RGB:</span> <span class="spec-value spec-feature">Yes</span></div>` : ''}
                </div>
            </div>
            <div class="part-card-footer">
                <span class="part-source">${ram.source || 'Unknown'}</span>
                ${ram.sourceUrl ? `<a href="${ram.sourceUrl}" target="_blank" class="part-link">View Details</a>` : ''}
            </div>
        `;
        
        return card;
    }

    createPSUCard(psu) {
        const card = document.createElement('div');
        card.className = 'part-card';
        card.dataset.componentId = psu._id || psu.title || psu.name;

        const title = psu.title || psu.name || 'Unknown PSU';
        
        // Handle price display with sale price support (same logic as GPUs)
        let price = psu.currentPrice || psu.salePrice || psu.basePrice || psu.price || 0;
        price = parseFloat(price) || 0;
        
        let priceDisplay = 'Price N/A';
        if (price > 0) {
            priceDisplay = `<span class="current-price">$${price.toFixed(2)}</span>`;
            
            // Check for sale pricing (same logic as GPU cards)
            if (psu.isOnSale && psu.basePrice && psu.salePrice) {
                const basePrice = parseFloat(psu.basePrice);
                const salePrice = parseFloat(psu.salePrice);
                if (basePrice > salePrice) {
                    const discountPercent = Math.round(((basePrice - salePrice) / basePrice) * 100);
                    priceDisplay = `
                        <span class="sale-price">$${salePrice.toFixed(2)}</span>
                        <span class="original-price">$${basePrice.toFixed(2)}</span>
                        <span class="discount">-${discountPercent}%</span>
                    `;
                }
            }
        }
        
        // Get brand/manufacturer for display
        const brand = psu.brand || psu.manufacturer || 'Unknown';
        
        // Format certification display
        let certificationDisplay = '';
        if (psu.certification) {
            certificationDisplay = psu.certification.includes('80') ? 
                psu.certification : `80+ ${psu.certification.charAt(0).toUpperCase() + psu.certification.slice(1)}`;
        }
        
        // Format modularity display
        let modularityDisplay = '';
        if (psu.modularity) {
            modularityDisplay = psu.modularity.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
        }
        
        card.innerHTML = `
            <div class="part-card-header">
                <div class="part-info">
                    <h3 class="part-title">${title}</h3>
                    <p class="part-manufacturer ${this.getManufacturerClass(brand)}">${brand}</p>
                </div>
                <div class="part-price">
                    ${priceDisplay}
                </div>
            </div>
            <div class="part-details">
                <div class="specs-grid">
                    ${psu.wattage ? `<div class="spec"><span class="spec-label">Wattage:</span> <span class="spec-value">${psu.wattage}W</span></div>` : ''}
                    ${certificationDisplay ? `<div class="spec"><span class="spec-label">Efficiency:</span> <span class="spec-value spec-feature">${certificationDisplay}</span></div>` : ''}
                    ${modularityDisplay ? `<div class="spec"><span class="spec-label">Modularity:</span> <span class="spec-value">${modularityDisplay}</span></div>` : ''}
                    ${psu.formFactor ? `<div class="spec"><span class="spec-label">Form Factor:</span> <span class="spec-value">${psu.formFactor.toUpperCase()}</span></div>` : ''}
                    ${psu.railConfig ? `<div class="spec"><span class="spec-label">Rail Config:</span> <span class="spec-value">${psu.railConfig.replace(/_/g, ' ')}</span></div>` : ''}
                    ${psu.features && psu.features.length > 0 ? `<div class="spec"><span class="spec-label">Features:</span> <span class="spec-value">${psu.features.join(', ').replace(/_/g, ' ')}</span></div>` : ''}
                </div>
            </div>
            <div class="part-card-footer">
                <span class="part-source">${psu.source || 'Unknown'}</span>
                ${this.createPSUSearchLink(psu)}
            </div>
        `;
        
        return card;
    }

    createPSUSearchLink(psu) {
        // Use direct URLs like other components (GPUs, CPUs, etc.)
        if (psu.sourceUrl || psu.url) {
            return `<a href="${psu.sourceUrl || psu.url}" target="_blank" class="part-link">
                <i class="fas fa-external-link-alt"></i>
                View on Amazon
            </a>`;
        }
        return '';
    }

    getManufacturerClass(manufacturer) {
        if (!manufacturer) return 'manufacturer-unknown';
        
        switch (manufacturer.toUpperCase()) {
            case 'NVIDIA':
                return 'manufacturer-nvidia';
            case 'AMD':
                return 'manufacturer-amd';
            case 'INTEL':
                return 'manufacturer-intel';
            default:
                return 'manufacturer-other';
        }
    }

    extractCardBrand(title) {
        if (!title) return null;
        
        const titleUpper = title.toUpperCase();
        
        // List of common card manufacturers
        const cardBrands = [
            'MSI', 'GIGABYTE', 'ASUS', 'EVGA', 'PNY', 'ZOTAC', 
            'PALIT', 'GAINWARD', 'INNO3D', 'GALAX', 'KFA2',
            'SAPPHIRE', 'XFX', 'POWERCOLOR', 'ASROCK', 'HIS',
            'NVIDIA', 'AMD', 'INTEL', 'FOUNDERS EDITION', 'VIPERA',
            'CORSAIR', 'THERMALTAKE', 'COOLER MASTER'
        ];
        
        // Special case for Founders Edition
        if (titleUpper.includes('FOUNDERS EDITION')) {
            return 'Founders Edition';
        }
        
        // Find matching brand
        for (const brand of cardBrands) {
            if (titleUpper.includes(brand)) {
                return brand;
            }
        }
        
        return null;
    }

    getCardBrandClass(cardBrand) {
        if (!cardBrand) return 'card-brand-unknown';
        
        const brand = cardBrand.toUpperCase();
        
        // Premium/Gaming brands
        if (['MSI', 'ASUS', 'GIGABYTE'].includes(brand)) {
            return 'card-brand-premium';
        }
        // Value brands
        else if (['PNY', 'ZOTAC', 'PALIT', 'GAINWARD'].includes(brand)) {
            return 'card-brand-value';
        }
        // AMD specific brands
        else if (['SAPPHIRE', 'XFX', 'POWERCOLOR'].includes(brand)) {
            return 'card-brand-amd-partner';
        }
        // Reference/Founders
        else if (['NVIDIA', 'AMD', 'INTEL', 'FOUNDERS EDITION'].includes(brand)) {
            return 'card-brand-reference';
        }
        // Others
        else {
            return 'card-brand-other';
        }
    }

    getPartSpecs(part) {
        const specs = [];
        
        switch (part.category) {
            case 'cpus':
                specs.push(
                    { label: 'Socket', value: part.socket },
                    { label: 'Cores', value: part.cores },
                    { label: 'Threads', value: part.threads },
                    { label: 'Base Clock', value: `${part.baseClock} GHz` },
                    { label: 'Boost Clock', value: `${part.boostClock} GHz` },
                    { label: 'TDP', value: `${part.tdp}W` }
                );
                break;
            case 'motherboards':
                specs.push(
                    { label: 'Chipset', value: part.chipset },
                    { label: 'Socket', value: part.socket },
                    { label: 'Form Factor', value: part.formFactor },
                    { label: 'Memory Type', value: part.memoryType.join(', ') }
                );
                break;
            case 'gpus':
                specs.push(
                    { label: 'Chipset', value: part.chipset },
                    { label: 'Memory', value: `${part.memory.size}GB ${part.memory.type}` }
                );
                break;
            case 'rams':
                specs.push(
                    { label: 'Capacity', value: `${part.totalCapacity}GB` },
                    { label: 'Speed', value: `${part.speed} MHz` },
                    { label: 'Type', value: part.memoryType },
                    { label: 'Kit Size', value: `${part.kitSize} sticks` }
                );
                break;
            case 'storages':
                // Format capacity: convert to TB if >= 1000 GB
                const storageCapacity = part.capacity >= 1000
                    ? `${part.capacity / 1000}TB`
                    : `${part.capacity}GB`;

                specs.push(
                    { label: 'Type', value: part.type },
                    { label: 'Capacity', value: storageCapacity },
                    { label: 'Read Speed', value: `${part.readSpeed} MB/s` },
                    { label: 'Write Speed', value: `${part.writeSpeed} MB/s` }
                );
                break;
            case 'psus':
                specs.push(
                    { label: 'Wattage', value: `${part.wattage}W` },
                    { label: 'Efficiency', value: part.efficiency },
                    { label: 'Modularity', value: part.modularity }
                );
                break;
            case 'cases':
                specs.push(
                    { label: 'Form Factor', value: part.formFactor.join(', ') }
                );
                break;
            case 'coolers':
                specs.push(
                    { label: 'Type', value: part.type },
                    { label: 'Socket', value: part.socket.join(', ') }
                );
                break;
        }
        
        return specs;
    }

    getPartFeatures(part) {
        return part.features || [];
    }

    updateStats() {
        const totalCount = document.getElementById('totalCount');
        if (totalCount) {
            totalCount.textContent = `Total: ${this.filteredGPUs.length}`;
        }

        const manufacturerName = this.currentManufacturer || 'All';
        const currentCategory = document.getElementById('currentCategory');
        if (currentCategory) {
            currentCategory.textContent = `Filter: ${manufacturerName} GPUs`;
        }
    }

    showLoading() {
        document.getElementById('loading').classList.remove('hidden');
    }

    hideLoading() {
        document.getElementById('loading').classList.add('hidden');
    }

    showError() {
        document.getElementById('error').classList.remove('hidden');
    }

    hideError() {
        document.getElementById('error').classList.add('hidden');
    }

    // GPU Selector Methods
    async populateGpuSelector() {
        const gpuSelect = document.getElementById('gpuSelect');

        // Preserve the currently selected value before clearing
        const currentSelectedValue = gpuSelect.value;

        gpuSelect.innerHTML = '<option value="">Choose a GPU...</option>';

        if (this.allGPUs.length === 0) return;

        // Group GPUs by model for better organization
        const gpuModels = {};
        this.allGPUs.forEach(gpu => {
            const modelName = this.extractModelName(gpu);
            if (!gpuModels[modelName]) {
                gpuModels[modelName] = [];
            }
            gpuModels[modelName].push(gpu);
        });

        // Sort models and add to selector
        const sortedModels = Object.keys(gpuModels).sort((a, b) => {
            // Sort NVIDIA first, then AMD, then others
            const aManufacturer = this.getManufacturerFromModel(a);
            const bManufacturer = this.getManufacturerFromModel(b);

            if (aManufacturer === bManufacturer) {
                return a.localeCompare(b);
            }

            if (aManufacturer === 'NVIDIA') return -1;
            if (bManufacturer === 'NVIDIA') return 1;
            if (aManufacturer === 'AMD') return -1;
            if (bManufacturer === 'AMD') return 1;

            return a.localeCompare(b);
        });

        sortedModels.forEach(model => {
            const gpus = gpuModels[model];
            const avgPrice = gpus.reduce((sum, gpu) => sum + (gpu.price || 0), 0) / gpus.length;
            const priceText = avgPrice > 0 ? ` - ~$${Math.round(avgPrice)}` : '';

            const option = document.createElement('option');
            option.value = JSON.stringify(gpus[0]); // Use first GPU as representative
            option.textContent = `${model}${priceText} (${gpus.length} available)`;
            gpuSelect.appendChild(option);
        });

        // Restore the previously selected value if it exists in the new options
        // Also restore if we have a selectedGPU stored
        if (this.selectedGPU && currentSelectedValue) {
            // Try to find the option with matching value
            const options = Array.from(gpuSelect.options);
            const matchingOption = options.find(opt => {
                if (!opt.value) return false;
                try {
                    const optGpu = JSON.parse(opt.value);
                    const selectedModel = this.extractModelName(this.selectedGPU);
                    const optModel = this.extractModelName(optGpu);
                    return selectedModel === optModel;
                } catch (e) {
                    return false;
                }
            });

            if (matchingOption) {
                gpuSelect.value = matchingOption.value;
            }
        } else if (currentSelectedValue) {
            // Just restore the exact value if it still exists
            gpuSelect.value = currentSelectedValue;
        }
    }

    extractModelName(gpu) {
        const name = gpu.title || gpu.name || '';
        // Extract GPU model from name (e.g., "RTX 4080", "RX 7900 XT")
        const modelPatterns = [
            /RTX\s*\d{4}\s*Ti?\s*Super?/i,
            /GTX\s*\d{4}\s*Ti?/i,
            /RX\s*\d{4}\s*X[TX]{1,2}/i,
            /Arc\s*A\d{3}/i
        ];
        
        for (const pattern of modelPatterns) {
            const match = name.match(pattern);
            if (match) {
                return match[0].toUpperCase().replace(/\s+/g, ' ');
            }
        }
        
        return gpu.manufacturer || 'Unknown GPU';
    }

    getManufacturerFromModel(modelName) {
        if (modelName.includes('RTX') || modelName.includes('GTX')) return 'NVIDIA';
        if (modelName.includes('RX')) return 'AMD';
        if (modelName.includes('ARC')) return 'Intel';
        return 'Other';
    }

    extractCpuModelName(cpu) {
        const name = cpu.title || cpu.name || '';
        // Extract CPU model from name
        const modelPatterns = [
            /Core\s*(i[3579]|Ultra\s*[579])-\d{4,5}[A-Z]{0,3}/i,
            /Ryzen\s*[3579]\s*\d{4}[X3D]{0,2}/i,
            /Threadripper\s*\d{4}[WX]{0,2}/i,
            /EPYC\s*\d{4}[P]?/i,
            /Xeon\s*[WE]-\d{4}/i
        ];

        for (const pattern of modelPatterns) {
            const match = name.match(pattern);
            if (match) {
                return match[0].replace(/\s+/g, ' ').trim();
            }
        }

        return cpu.title || cpu.name || 'Unknown CPU';
    }

    getManufacturerFromCpuModel(modelName) {
        const upperName = modelName.toUpperCase();
        if (upperName.includes('CORE') || upperName.includes('XEON') || upperName.includes('PENTIUM') || upperName.includes('CELERON')) return 'Intel';
        if (upperName.includes('RYZEN') || upperName.includes('THREADRIPPER') || upperName.includes('EPYC') || upperName.includes('ATHLON')) return 'AMD';
        return 'Other';
    }

    handleGpuSelection(value) {
        const selectBtn = document.getElementById('selectGpuBtn');
        if (value) {
            selectBtn.disabled = false;
        } else {
            selectBtn.disabled = true;
        }
    }

    selectGPU() {
        const gpuSelect = document.getElementById('gpuSelect');
        const selectedValue = gpuSelect.value;
        
        if (!selectedValue) return;
        
        try {
            this.selectedGPU = JSON.parse(selectedValue);
            this.displaySelectedGPU();
            this.hideGpuSelector();
        } catch (error) {
            console.error('Error selecting GPU:', error);
        }
    }

    displaySelectedGPU() {
        if (!this.selectedGPU) return;
        
        const selectedGpuDiv = document.getElementById('selectedGpu');
        const nameEl = document.getElementById('selectedGpuName');
        const specsEl = document.getElementById('selectedGpuSpecs');
        const priceEl = document.getElementById('selectedGpuPrice');
        const availabilityEl = document.getElementById('selectedGpuAvailability');
        
        nameEl.textContent = this.selectedGPU.title || this.selectedGPU.name || 'GPU';
        
        // Build specs string
        const specs = [];
        if (this.selectedGPU.manufacturer) specs.push(this.selectedGPU.manufacturer);
        if (this.selectedGPU.partner) specs.push(this.selectedGPU.partner);
        if (this.selectedGPU.memory && this.selectedGPU.memory.size) {
            specs.push(`${this.selectedGPU.memory.size}GB ${this.selectedGPU.memory.type || 'VRAM'}`);
        }
        specsEl.textContent = specs.join(' • ');
        
        // Price
        const price = this.selectedGPU.price || this.selectedGPU.currentPrice || 0;
        priceEl.textContent = price > 0 ? `$${price.toFixed(2)}` : 'Price unavailable';
        
        // Availability (you can enhance this based on your data)
        availabilityEl.textContent = 'In Stock';
        availabilityEl.className = 'availability';
        
        selectedGpuDiv.classList.remove('hidden');
    }

    hideGpuSelector() {
        document.querySelector('.gpu-selector').style.display = 'none';
        document.querySelector('.gpu-selector-section p').textContent = 'Selected GPU for your build';
    }

    showGpuSelector() {
        document.querySelector('.gpu-selector').style.display = 'flex';
        document.querySelector('.gpu-selector-section p').textContent = 'Select a GPU to build your PC around';
        document.getElementById('selectedGpu').classList.add('hidden');

        const gpuSelect = document.getElementById('gpuSelect');

        // If we have a selected GPU, keep it selected in the dropdown
        if (this.selectedGPU) {
            // The dropdown should already have the correct value from populateGpuSelector
            // Just make sure the button is enabled
            document.getElementById('selectGpuBtn').disabled = false;
        } else {
            // Reset selector only if no GPU is selected
            gpuSelect.value = '';
            document.getElementById('selectGpuBtn').disabled = true;
        }

        // Scroll to the GPU selector section
        const gpuSelectorSection = document.querySelector('.gpu-selector-section');
        if (gpuSelectorSection) {
            gpuSelectorSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }

        // After scrolling to the section, scroll the selected option into view within the dropdown
        if (this.selectedGPU && gpuSelect.value) {
            // Small delay to allow the section scroll to complete first
            setTimeout(() => {
                const selectedIndex = gpuSelect.selectedIndex;
                if (selectedIndex > 0) {
                    // Convert select to a list box temporarily to enable scrolling
                    const originalSize = gpuSelect.size;
                    gpuSelect.size = 10; // Show 10 items at once

                    // Calculate the scroll position to center the selected option
                    const optionHeight = 30; // Approximate height of each option
                    const scrollTop = Math.max(0, (selectedIndex - 5) * optionHeight);

                    // Scroll to the selected option
                    gpuSelect.scrollTop = scrollTop;

                    // Focus to make it visible
                    gpuSelect.focus();

                    // Revert back to dropdown after a moment
                    setTimeout(() => {
                        gpuSelect.size = originalSize || 0;
                    }, 100);
                }
            }, 600); // 600ms delay to let the section scroll animation finish
        }
    }

    buildAroundGPU() {
        if (!this.selectedGPU) return;
        
        // This is where you'd implement PC building logic
        // For now, we'll show an alert with GPU info
        const gpuName = this.selectedGPU.title || this.selectedGPU.name;
        const price = this.selectedGPU.price || this.selectedGPU.currentPrice || 0;
        
        alert(`Building PC around: ${gpuName}\nPrice: $${price}\n\nPC Building functionality coming soon!`);
        
        // Future implementation could:
        // - Navigate to a PC builder page
        // - Show compatible CPUs, motherboards, PSUs
        // - Calculate recommended system specs
        // - Estimate total build cost
    }

    // CPU Selector Methods
    openCpuSelectorModal() {
        this.modalContext = 'cpu-tab'; // Track that we're in the CPU tab context
        this.openComponentModal('cpu');
    }

    populateCpuSelector() {
        // Legacy method - kept for backward compatibility
        // The modal system is now used instead
    }

    handleCpuSelection(value) {
        // Legacy method - no longer needed with modal system
    }

    selectCPU(cpu) {
        // Updated to accept cpu object directly from modal
        if (!cpu) return;

        this.selectedCPU = cpu;
        this.displaySelectedCPU();
        this.hideCpuSelector();

        // Close the modal
        this.closeComponentModal();
    }

    displaySelectedCPU() {
        if (!this.selectedCPU) return;
        
        const selectedCpuDiv = document.getElementById('selectedCpu');
        const cpuName = document.getElementById('selectedCpuName');
        const cpuSpecs = document.getElementById('selectedCpuSpecs');
        const cpuPrice = document.getElementById('selectedCpuPrice');
        const cpuAvailability = document.getElementById('selectedCpuAvailability');
        
        // Display CPU information
        cpuName.textContent = this.selectedCPU.title || this.selectedCPU.name || 'Unknown CPU';
        
        // Build specs string
        const specs = this.selectedCPU.specifications || {};
        const specsParts = [];
        if (specs.cores) specsParts.push(`${specs.cores} Cores`);
        if (specs.threads) specsParts.push(`${specs.threads} Threads`);
        if (specs.baseClock) specsParts.push(`${specs.baseClock}GHz Base`);
        if (specs.boostClock) specsParts.push(`${specs.boostClock}GHz Boost`);
        if (this.selectedCPU.socket) specsParts.push(`${this.selectedCPU.socket} Socket`);
        
        cpuSpecs.textContent = specsParts.join(' • ') || 'No specifications available';
        
        const price = this.selectedCPU.currentPrice || this.selectedCPU.price;
        cpuPrice.textContent = price ? `$${price.toFixed(2)}` : 'Price not available';
        
        cpuAvailability.textContent = this.selectedCPU.availability || 'In Stock';
        cpuAvailability.className = 'availability ' + (this.selectedCPU.availability === 'In Stock' ? 'in-stock' : 'out-of-stock');
        
        // Hide selector, show selected CPU
        document.querySelector('.cpu-selector').style.display = 'none';
        selectedCpuDiv.classList.remove('hidden');
    }

    hideCpuSelector() {
        document.querySelector('.cpu-selector').style.display = 'none';
        document.querySelector('.cpu-selector-section p').textContent = 'Selected CPU for your build';
    }

    showCpuSelector() {
        document.querySelector('.cpu-selector').style.display = 'flex';
        document.querySelector('.cpu-selector-section p').textContent = 'Select a CPU to build your PC around';
        document.getElementById('selectedCpu').classList.add('hidden');

        // Clear the selected CPU
        this.selectedCPU = null;
    }

    buildAroundCPU() {
        if (!this.selectedCPU) return;
        
        const cpuName = this.selectedCPU.title || this.selectedCPU.name;
        const price = this.selectedCPU.price || this.selectedCPU.currentPrice || 0;
        
        alert(`Building PC around: ${cpuName}\nPrice: $${price}\n\nPC Building functionality coming soon!`);
        
        // Future implementation could:
        // - Navigate to a PC builder page
        // - Show compatible motherboards, GPUs, RAM
        // - Calculate power requirements
        // - Suggest optimal cooling solutions
    }

    // Motherboard Selector Methods
    populateMotherboardSelector() {
        const motherboardSelect = document.getElementById('motherboardSelect');
        motherboardSelect.innerHTML = '<option value="">Choose a Motherboard...</option>';
        
        // Group motherboards by manufacturer for better organization
        const motherboardsByManufacturer = {};
        this.allMotherboards.forEach(motherboard => {
            const manufacturer = motherboard.manufacturer || 'Unknown';
            if (!motherboardsByManufacturer[manufacturer]) {
                motherboardsByManufacturer[manufacturer] = [];
            }
            motherboardsByManufacturer[manufacturer].push(motherboard);
        });
        
        // Add options by manufacturer groups
        Object.keys(motherboardsByManufacturer).sort().forEach(manufacturer => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = manufacturer;
            
            motherboardsByManufacturer[manufacturer].forEach((motherboard, index) => {
                const option = document.createElement('option');
                option.value = `${manufacturer}-${index}`;
                option.textContent = motherboard.title || motherboard.name || 'Unknown Motherboard';
                optgroup.appendChild(option);
            });
            
            motherboardSelect.appendChild(optgroup);
        });
    }

    handleMotherboardSelection(value) {
        const selectBtn = document.getElementById('selectMotherboardBtn');
        if (value) {
            selectBtn.disabled = false;
            selectBtn.textContent = '✓ Select This Motherboard';
        } else {
            selectBtn.disabled = true;
            selectBtn.textContent = 'Select This Motherboard';
        }
    }

    selectMotherboard() {
        const motherboardSelect = document.getElementById('motherboardSelect');
        const selectedValue = motherboardSelect.value;
        
        if (!selectedValue) return;
        
        const [manufacturer, index] = selectedValue.split('-');
        const motherboardsByManufacturer = {};
        
        this.allMotherboards.forEach(motherboard => {
            const mfg = motherboard.manufacturer || 'Unknown';
            if (!motherboardsByManufacturer[mfg]) {
                motherboardsByManufacturer[mfg] = [];
            }
            motherboardsByManufacturer[mfg].push(motherboard);
        });
        
        this.selectedMotherboard = motherboardsByManufacturer[manufacturer][parseInt(index)];
        this.displaySelectedMotherboard();
    }

    displaySelectedMotherboard() {
        if (!this.selectedMotherboard) return;
        
        const selectedMotherboardDiv = document.getElementById('selectedMotherboard');
        const motherboardName = document.getElementById('selectedMotherboardName');
        const motherboardSpecs = document.getElementById('selectedMotherboardSpecs');
        const motherboardPrice = document.getElementById('selectedMotherboardPrice');
        const motherboardAvailability = document.getElementById('selectedMotherboardAvailability');
        
        // Display motherboard information
        motherboardName.textContent = this.selectedMotherboard.title || this.selectedMotherboard.name || 'Unknown Motherboard';
        
        // Build specs string
        const specsParts = [];
        if (this.selectedMotherboard.chipset) specsParts.push(this.selectedMotherboard.chipset);
        if (this.selectedMotherboard.socket) specsParts.push(`${this.selectedMotherboard.socket} Socket`);
        if (this.selectedMotherboard.formFactor) specsParts.push(this.selectedMotherboard.formFactor);
        if (this.selectedMotherboard.memoryType && this.selectedMotherboard.memoryType.length) {
            specsParts.push(this.selectedMotherboard.memoryType.join('/'));
        }
        if (this.selectedMotherboard.maxMemory) specsParts.push(`Up to ${this.selectedMotherboard.maxMemory}GB RAM`);

        motherboardSpecs.textContent = specsParts.join(' • ') || 'No specifications available';
        
        // Handle sale pricing display (same logic as PSU and RAM selectors)
        let priceDisplay = 'Price not available';
        if (this.selectedMotherboard.isOnSale && this.selectedMotherboard.basePrice && this.selectedMotherboard.salePrice) {
            const basePrice = parseFloat(this.selectedMotherboard.basePrice);
            const salePrice = parseFloat(this.selectedMotherboard.salePrice);
            if (basePrice > salePrice) {
                const discountPercent = Math.round(((basePrice - salePrice) / basePrice) * 100);
                priceDisplay = `$${salePrice.toFixed(2)} (was $${basePrice.toFixed(2)}, -${discountPercent}%)`;
            } else {
                priceDisplay = `$${salePrice.toFixed(2)}`;
            }
        } else {
            const price = this.selectedMotherboard.currentPrice || this.selectedMotherboard.price;
            priceDisplay = price ? `$${parseFloat(price).toFixed(2)}` : 'Price not available';
        }
        motherboardPrice.textContent = priceDisplay;
        
        motherboardAvailability.textContent = this.selectedMotherboard.availability || 'In Stock';
        motherboardAvailability.className = 'availability ' + (this.selectedMotherboard.availability === 'In Stock' ? 'in-stock' : 'out-of-stock');
        
        // Hide selector, show selected motherboard
        document.querySelector('.motherboard-selector').style.display = 'none';
        selectedMotherboardDiv.classList.remove('hidden');
    }

    showMotherboardSelector() {
        document.querySelector('.motherboard-selector').style.display = 'flex';
        document.getElementById('selectedMotherboard').classList.add('hidden');
        
        // Reset selector
        document.getElementById('motherboardSelect').value = '';
        document.getElementById('selectMotherboardBtn').disabled = true;
    }

    buildAroundMotherboard() {
        if (!this.selectedMotherboard) return;
        
        const motherboardName = this.selectedMotherboard.title || this.selectedMotherboard.name;
        const price = this.selectedMotherboard.price || this.selectedMotherboard.currentPrice || 0;
        
        alert(`Building PC around: ${motherboardName}\nPrice: $${price}\n\nPC Building functionality coming soon!`);
        
        // Future implementation could:
        // - Navigate to a PC builder page
        // - Show compatible CPUs based on socket
        // - Show compatible RAM types
        // - Suggest appropriate form factor cases
        // - Calculate expansion capabilities
    }

    // RAM Selector Methods
    populateRamSelector() {
        const ramSelect = document.getElementById('ramSelect');
        ramSelect.innerHTML = '<option value="">Choose RAM...</option>';
        
        // Group RAM by manufacturer for better organization
        const ramByManufacturer = {};
        this.allRAM.forEach(ram => {
            const manufacturer = ram.manufacturer || 'Unknown';
            if (!ramByManufacturer[manufacturer]) {
                ramByManufacturer[manufacturer] = [];
            }
            ramByManufacturer[manufacturer].push(ram);
        });
        
        // Add options by manufacturer groups
        Object.keys(ramByManufacturer).sort().forEach(manufacturer => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = manufacturer;
            
            ramByManufacturer[manufacturer].forEach((ram, index) => {
                const option = document.createElement('option');
                option.value = `${manufacturer}-${index}`;
                option.textContent = ram.title || ram.name || 'Unknown RAM';
                optgroup.appendChild(option);
            });
            
            ramSelect.appendChild(optgroup);
        });
    }

    populatePsuSelector() {
        const psuSelect = document.getElementById('psuSelect');
        psuSelect.innerHTML = '<option value="">Choose a PSU...</option>';
        
        // Group PSUs by manufacturer for better organization
        const psuByManufacturer = {};
        this.allPSUs.forEach(psu => {
            const manufacturer = psu.manufacturer || psu.brand || 'Unknown';
            if (!psuByManufacturer[manufacturer]) {
                psuByManufacturer[manufacturer] = [];
            }
            psuByManufacturer[manufacturer].push(psu);
        });
        
        // Add options by manufacturer groups
        Object.keys(psuByManufacturer).sort().forEach(manufacturer => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = manufacturer;
            
            psuByManufacturer[manufacturer].forEach((psu, index) => {
                const option = document.createElement('option');
                option.value = `${manufacturer}-${index}`;
                option.textContent = psu.title || psu.name || 'Unknown PSU';
                optgroup.appendChild(option);
            });
            
            psuSelect.appendChild(optgroup);
        });
    }

    handlePsuSelection(value) {
        const selectBtn = document.getElementById('selectPsuBtn');
        if (value) {
            selectBtn.disabled = false;
            selectBtn.textContent = '✓ Select This PSU';
        } else {
            selectBtn.disabled = true;
            selectBtn.textContent = 'Select This PSU';
        }
    }

    selectPSU() {
        const psuSelect = document.getElementById('psuSelect');
        const value = psuSelect.value;
        
        if (value) {
            const [manufacturer, index] = value.split('-');
            const psuByManufacturer = {};
            this.allPSUs.forEach(psu => {
                const mfg = psu.manufacturer || psu.brand || 'Unknown';
                if (!psuByManufacturer[mfg]) {
                    psuByManufacturer[mfg] = [];
                }
                psuByManufacturer[mfg].push(psu);
            });
            
            this.selectedPSU = psuByManufacturer[manufacturer][parseInt(index)];
            this.showSelectedPsu();
        }
    }

    showSelectedPsu() {
        const psuSelector = document.querySelector('.psu-selector');
        const selectedPsuDiv = document.getElementById('selectedPsu');
        
        psuSelector.style.display = 'none';
        selectedPsuDiv.classList.remove('hidden');
        
        // Update PSU details
        document.getElementById('selectedPsuName').textContent = this.selectedPSU.title || this.selectedPSU.name || 'Unknown PSU';
        document.getElementById('selectedPsuSpecs').textContent = this.getPsuSpecs(this.selectedPSU);
        document.getElementById('selectedPsuPrice').textContent = this.selectedPSU.price ? `$${this.selectedPSU.price}` : 'Price not available';
        document.getElementById('selectedPsuAvailability').textContent = this.selectedPSU.availability || 'In Stock';
    }

    showPsuSelector() {
        const psuSelector = document.querySelector('.psu-selector');
        const selectedPsuDiv = document.getElementById('selectedPsu');
        
        psuSelector.style.display = 'block';
        selectedPsuDiv.classList.add('hidden');
        
        // Reset selector
        document.getElementById('psuSelect').value = '';
        document.getElementById('selectPsuBtn').disabled = true;
        document.getElementById('selectPsuBtn').textContent = 'Select This PSU';
    }

    getPsuSpecs(psu) {
        let specs = [];
        
        if (psu.wattage) specs.push(`${psu.wattage}W`);
        if (psu.certification) specs.push(`80+ ${psu.certification.charAt(0).toUpperCase() + psu.certification.slice(1)}`);
        if (psu.modularity) {
            let modText = psu.modularity.replace('_', ' ');
            modText = modText.charAt(0).toUpperCase() + modText.slice(1);
            specs.push(modText);
        }
        if (psu.formFactor && psu.formFactor !== 'atx') specs.push(psu.formFactor.toUpperCase());
        
        return specs.length > 0 ? specs.join(' • ') : 'Specifications not available';
    }

    buildAroundPSU() {
        console.log('Building PC around PSU:', this.selectedPSU);
        alert('PSU-based PC building feature coming soon!');
    }

    // Cooler Selector Methods
    populateCoolerSelector() {
        const coolerSelect = document.getElementById('coolerSelect');
        coolerSelect.innerHTML = '<option value="">Choose a Cooler...</option>';
        
        // Group coolers by manufacturer for better organization
        const coolerByManufacturer = {};
        this.allCoolers.forEach(cooler => {
            const manufacturer = cooler.manufacturer || cooler.brand || 'Unknown';
            if (!coolerByManufacturer[manufacturer]) {
                coolerByManufacturer[manufacturer] = [];
            }
            coolerByManufacturer[manufacturer].push(cooler);
        });
        
        // Add options by manufacturer groups
        Object.keys(coolerByManufacturer).sort().forEach(manufacturer => {
            const optgroup = document.createElement('optgroup');
            optgroup.label = manufacturer;
            
            coolerByManufacturer[manufacturer].forEach((cooler, index) => {
                const option = document.createElement('option');
                option.value = `${manufacturer}-${index}`;
                option.textContent = cooler.title || cooler.name || 'Unknown Cooler';
                optgroup.appendChild(option);
            });
            
            coolerSelect.appendChild(optgroup);
        });
    }

    handleCoolerSelection(value) {
        const selectBtn = document.getElementById('selectCoolerBtn');
        if (value) {
            selectBtn.disabled = false;
            selectBtn.textContent = '✓ Select This Cooler';
        } else {
            selectBtn.disabled = true;
            selectBtn.textContent = 'Select This Cooler';
        }
    }

    selectCooler() {
        const coolerSelect = document.getElementById('coolerSelect');
        const value = coolerSelect.value;
        
        if (value) {
            const [manufacturer, index] = value.split('-');
            const coolerByManufacturer = {};
            this.allCoolers.forEach(cooler => {
                const mfg = cooler.manufacturer || cooler.brand || 'Unknown';
                if (!coolerByManufacturer[mfg]) {
                    coolerByManufacturer[mfg] = [];
                }
                coolerByManufacturer[mfg].push(cooler);
            });
            
            this.selectedCooler = coolerByManufacturer[manufacturer][parseInt(index)];
            this.showSelectedCooler();
        }
    }

    showSelectedCooler() {
        const coolerSelector = document.querySelector('.cooler-selector');
        const selectedCoolerDiv = document.getElementById('selectedCooler');
        
        coolerSelector.style.display = 'none';
        selectedCoolerDiv.classList.remove('hidden');
        
        // Update cooler details with sale price support
        document.getElementById('selectedCoolerName').textContent = this.selectedCooler.title || this.selectedCooler.name || 'Unknown Cooler';
        document.getElementById('selectedCoolerSpecs').textContent = this.getCoolerSpecs(this.selectedCooler);
        
        // Price display with sale support
        const priceElement = document.getElementById('selectedCoolerPrice');
        if (this.selectedCooler.isOnSale && this.selectedCooler.basePrice && this.selectedCooler.salePrice) {
            const discountPercent = Math.round(((this.selectedCooler.basePrice - this.selectedCooler.salePrice) / this.selectedCooler.basePrice) * 100);
            priceElement.innerHTML = `$${this.selectedCooler.salePrice.toFixed(2)} <span style="text-decoration: line-through; color: #888;">$${this.selectedCooler.basePrice.toFixed(2)}</span> <span style="color: #e74c3c; font-weight: bold;">-${discountPercent}%</span>`;
        } else {
            const price = this.selectedCooler.currentPrice || this.selectedCooler.price || this.selectedCooler.basePrice;
            priceElement.textContent = price ? `$${price}` : 'Price not available';
        }
        
        document.getElementById('selectedCoolerAvailability').textContent = this.selectedCooler.availability || 'In Stock';
    }

    showCoolerSelector() {
        const coolerSelector = document.querySelector('.cooler-selector');
        const selectedCoolerDiv = document.getElementById('selectedCooler');
        
        coolerSelector.style.display = 'block';
        selectedCoolerDiv.classList.add('hidden');
        
        // Reset selector
        document.getElementById('coolerSelect').value = '';
        document.getElementById('selectCoolerBtn').disabled = true;
        document.getElementById('selectCoolerBtn').textContent = 'Select This Cooler';
    }

    getCoolerSpecs(cooler) {
        let specs = [];
        
        if (cooler.coolerType) specs.push(cooler.coolerType);
        if (cooler.radiatorSize) specs.push(cooler.radiatorSize);
        if (cooler.fanSize) specs.push(`${cooler.fanSize} Fan`);
        if (cooler.performanceTier) specs.push(cooler.performanceTier);
        if (cooler.specifications && cooler.specifications.rgb) specs.push('RGB');
        if (cooler.socketCompatibility && cooler.socketCompatibility.length > 0) {
            specs.push(`Supports: ${cooler.socketCompatibility.join(', ')}`);
        }
        
        return specs.length > 0 ? specs.join(' • ') : 'Specifications not available';
    }

    buildAroundCooler() {
        console.log('Building PC around Cooler:', this.selectedCooler);
        alert('Cooler-based PC building feature coming soon!');
    }

    // PC Builder Methods
    initializePCBuilder() {
        // Populate all component selectors
        this.populateBuilderSelectors();
        this.updateTotalPrice();
        this.checkCompatibility();
        
        // Update header for components count
        const componentCount = Object.values(this.currentBuild).filter(component => component !== null).length;
        const el = document.getElementById('totalParts'); if (el) el.textContent = componentCount;
    }

    populateBuilderSelectors() {
        this.populateBuilderFilters();
        this.populateBuilderGpuSelector();
        this.populateBuilderCpuSelector();
        this.populateBuilderMotherboardSelector();
        this.populateBuilderRamSelector();
        this.populateBuilderCoolerSelector();
        this.populateBuilderPsuSelector();
    }

    populateBuilderFilters() {
        // Populate manufacturer filters
        this.populateManufacturerFilter('gpuManufacturerFilter', this.allGPUs);
        this.populateManufacturerFilter('cpuManufacturerFilter', this.allCPUs);
        
        // Populate socket filter for motherboards
        this.populateSocketFilter();
        
        // Populate RAM type filter
        this.populateRamTypeFilter();
        
        // Populate cooler type filter
        this.populateCoolerTypeFilter();
        
        // Populate PSU wattage filter
        this.populatePsuWattageFilter();
    }

    populateManufacturerFilter(filterId, components) {
        const filter = document.getElementById(filterId);
        if (!filter) {
            console.error(`Filter element ${filterId} not found`);
            return;
        }

        if (!components || !Array.isArray(components) || components.length === 0) {
            console.log(`No components provided for ${filterId}`);
            return;
        }

        const manufacturers = new Set();

        components.forEach(component => {
            const manufacturer = component.manufacturer || component.brand;
            if (manufacturer) {
                manufacturers.add(manufacturer);
            }
        });

        // Clear and repopulate
        filter.innerHTML = '<option value="">All Manufacturers</option>';
        Array.from(manufacturers).sort().forEach(manufacturer => {
            const option = document.createElement('option');
            option.value = manufacturer;
            option.textContent = manufacturer;
            filter.appendChild(option);
        });
    }

    populateSocketFilter() {
        const filter = document.getElementById('motherboardSocketFilter');
        const sockets = new Set();
        
        this.allMotherboards.forEach(motherboard => {
            if (motherboard.socket) {
                sockets.add(motherboard.socket);
            }
        });
        
        filter.innerHTML = '<option value="">All Sockets</option>';
        Array.from(sockets).sort().forEach(socket => {
            const option = document.createElement('option');
            option.value = socket;
            option.textContent = socket;
            filter.appendChild(option);
        });
    }

    populateRamTypeFilter() {
        const filter = document.getElementById('ramTypeFilter');
        const types = new Set();
        
        this.allRAM.forEach(ram => {
            if (ram.memoryType) {
                types.add(ram.memoryType);
            }
        });
        
        filter.innerHTML = '<option value="">All Types</option>';
        Array.from(types).sort().forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            filter.appendChild(option);
        });
    }

    populateCoolerTypeFilter() {
        const filter = document.getElementById('coolerTypeFilter');
        const types = new Set();
        
        this.allCoolers.forEach(cooler => {
            if (cooler.coolerType) {
                types.add(cooler.coolerType);
            }
        });
        
        filter.innerHTML = '<option value="">All Types</option>';
        Array.from(types).sort().forEach(type => {
            const option = document.createElement('option');
            option.value = type;
            option.textContent = type;
            filter.appendChild(option);
        });
    }

    populatePsuWattageFilter() {
        const filter = document.getElementById('psuWattageFilter');
        const wattageRanges = [
            { label: '400-500W', min: 400, max: 500 },
            { label: '500-650W', min: 500, max: 650 },
            { label: '650-750W', min: 650, max: 750 },
            { label: '750-850W', min: 750, max: 850 },
            { label: '850W+', min: 850, max: 9999 }
        ];
        
        filter.innerHTML = '<option value="">All Wattages</option>';
        wattageRanges.forEach(range => {
            const option = document.createElement('option');
            option.value = `${range.min}-${range.max}`;
            option.textContent = range.label;
            filter.appendChild(option);
        });
    }

    populateBuilderGpuSelector() {
        this.sortAndFilterBuilderComponents('gpu');
    }

    sortAndFilterBuilderComponents(componentType) {
        const components = this.getComponentArray(componentType);
        const sortSelect = document.getElementById(`${componentType}SortSelect`);
        const filterSelect = this.getFilterSelect(componentType);
        const builderSelect = document.getElementById(`builder${componentType.charAt(0).toUpperCase() + componentType.slice(1)}Select`);

        // If the builder select dropdown doesn't exist, skip this function
        // (it's been replaced with modal buttons in the new UI)
        if (!builderSelect) {
            console.log(`Builder select dropdown for ${componentType} not found - using modal instead`);
            return;
        }

        // Get current sort and filter values
        const sortBy = sortSelect.value;
        const filterValue = filterSelect ? filterSelect.value : '';

        // Filter components
        let filteredComponents = [...components];
        if (filterValue) {
            filteredComponents = this.applyComponentFilter(filteredComponents, componentType, filterValue);
        }

        // Sort components
        filteredComponents = this.sortComponents(filteredComponents, componentType, sortBy);

        // Populate selector
        builderSelect.innerHTML = `<option value="">Choose a ${this.getComponentDisplayName(componentType)}...</option>`;

        filteredComponents.forEach((component, index) => {
            const option = document.createElement('option');
            // Store original index for component lookup
            const originalIndex = components.indexOf(component);
            option.value = originalIndex;
            option.innerHTML = this.formatComponentOption(component, componentType);
            builderSelect.appendChild(option);
        });
    }

    getComponentArray(componentType) {
        switch (componentType) {
            case 'gpu': return this.allGPUs;
            case 'cpu': return this.allCPUs;
            case 'motherboard': return this.allMotherboards;
            case 'ram': return this.allRAM;
            case 'cooler': return this.allCoolers;
            case 'psu': return this.allPSUs;
            case 'storage': return this.allStorage;
            case 'storage2': return this.allStorage;
            case 'storage3': return this.allStorage;
            case 'storage4': return this.allStorage;
            case 'storage5': return this.allStorage;
            case 'storage6': return this.allStorage;
            case 'case': return this.allCases;
            case 'addon': return this.allAddons;
            case 'addon2': return this.allAddons;
            case 'addon3': return this.allAddons;
            case 'addon4': return this.allAddons;
            case 'addon5': return this.allAddons;
            case 'addon6': return this.allAddons;
            default: return [];
        }
    }

    getFilterSelect(componentType) {
        switch (componentType) {
            case 'gpu': return document.getElementById('gpuManufacturerFilter');
            case 'cpu': return document.getElementById('cpuManufacturerFilter');
            case 'motherboard': return document.getElementById('motherboardSocketFilter');
            case 'ram': return document.getElementById('ramTypeFilter');
            case 'cooler': return document.getElementById('coolerTypeFilter');
            case 'psu': return document.getElementById('psuWattageFilter');
            case 'case': return document.getElementById('caseFormFactorFilter');
            default: return null;
        }
    }

    getComponentDisplayName(componentType) {
        switch (componentType) {
            case 'gpu': return 'GPU';
            case 'cpu': return 'CPU';
            case 'motherboard': return 'Motherboard';
            case 'ram': return 'RAM';
            case 'cooler': return 'Cooler';
            case 'psu': return 'PSU';
            case 'case': return 'Case';
            case 'storage':
            case 'storage2':
            case 'storage3':
            case 'storage4':
            case 'storage5':
            case 'storage6':
                return 'Storage';
            case 'addon':
            case 'addon2':
            case 'addon3':
            case 'addon4':
            case 'addon5':
            case 'addon6':
                return 'Add-on';
            default: return 'Component';
        }
    }

    applyComponentFilter(components, componentType, filterValue) {
        if (!components || !Array.isArray(components)) {
            console.error('applyComponentFilter called with invalid components:', components);
            return [];
        }

        if (!filterValue) {
            return components;
        }

        switch (componentType) {
            case 'gpu':
            case 'cpu':
                return components.filter(component =>
                    (component.manufacturer || component.brand || '').toLowerCase() === filterValue.toLowerCase()
                );
            case 'motherboard':
                return components.filter(component => component.socket === filterValue);
            case 'ram':
                return components.filter(component => component.memoryType === filterValue);
            case 'cooler':
                return components.filter(component => component.coolerType === filterValue);
            case 'psu':
                const [min, max] = filterValue.split('-').map(Number);
                return components.filter(component => {
                    const wattage = parseInt(component.wattage) || 0;
                    return wattage >= min && wattage <= max;
                });
            case 'case':
                return components.filter(component => {
                    const formFactors = component.formFactor || [];
                    const formFactorArray = Array.isArray(formFactors) ? formFactors : [formFactors];
                    return formFactorArray.includes(filterValue);
                });
            default:
                return components;
        }
    }

    sortComponents(components, componentType, sortBy) {
        if (!components || !Array.isArray(components)) {
            console.error('sortComponents called with invalid components:', components);
            return [];
        }

        return components.sort((a, b) => {
            switch (sortBy) {
                case 'name':
                    const nameA = (a.title || a.name || '').toLowerCase();
                    const nameB = (b.title || b.name || '').toLowerCase();
                    return nameA.localeCompare(nameB);
                
                case 'price-low':
                    return this.getComponentPrice(a) - this.getComponentPrice(b);
                
                case 'price-high':
                    return this.getComponentPrice(b) - this.getComponentPrice(a);
                
                case 'discount':
                    return this.getComponentDiscount(b) - this.getComponentDiscount(a);
                
                case 'manufacturer':
                    const mfgA = (a.manufacturer || a.brand || '').toLowerCase();
                    const mfgB = (b.manufacturer || b.brand || '').toLowerCase();
                    return mfgA.localeCompare(mfgB);
                
                // Component-specific sorting
                case 'memory': // GPU memory
                    const memA = parseInt(a.memorySize) || 0;
                    const memB = parseInt(b.memorySize) || 0;
                    return memB - memA;
                
                case 'cores': // CPU cores
                    const coresA = parseInt(a.cores) || 0;
                    const coresB = parseInt(b.cores) || 0;
                    return coresB - coresA;
                
                case 'socket': // Motherboard socket
                    return (a.socket || '').localeCompare(b.socket || '');
                
                case 'formfactor': // Motherboard form factor
                    return (a.formFactor || '').localeCompare(b.formFactor || '');
                
                case 'capacity': // RAM capacity
                    const capA = parseInt(a.capacity) || 0;
                    const capB = parseInt(b.capacity) || 0;
                    return capB - capA;
                
                case 'speed': // RAM speed
                    const speedA = parseInt(a.speed) || 0;
                    const speedB = parseInt(b.speed) || 0;
                    return speedB - speedA;
                
                case 'type': // Storage type sorting
                    const typeA = (a.type || '').toLowerCase();
                    const typeB = (b.type || '').toLowerCase();
                    return typeA.localeCompare(typeB);

                case 'coolerType': // Cooler type sorting
                    const coolerTypeA = (a.coolerType || '').toLowerCase();
                    const coolerTypeB = (b.coolerType || '').toLowerCase();
                    return coolerTypeA.localeCompare(coolerTypeB);
                
                case 'performance': // CPU/Cooler performance
                    const perfA = (a.performanceTier || '').toLowerCase();
                    const perfB = (b.performanceTier || '').toLowerCase();
                    return perfA.localeCompare(perfB);
                
                case 'wattage': // PSU wattage
                    const wattA = parseInt(a.wattage) || 0;
                    const wattB = parseInt(b.wattage) || 0;
                    return wattB - wattA;
                
                case 'efficiency': // PSU efficiency
                    return (a.certification || '').localeCompare(b.certification || '');

                case 'releaseYear': // CPU release year
                    const yearA = parseInt(a.releaseYear) || 0;
                    const yearB = parseInt(b.releaseYear) || 0;
                    return yearB - yearA; // Newer first

                default:
                    return 0;
            }
        });
    }

    getComponentPrice(component) {
        return parseFloat(component.currentPrice || component.salePrice || component.basePrice || component.price) || 0;
    }

    getComponentDiscount(component) {
        if (component.isOnSale && component.basePrice && component.salePrice) {
            const base = parseFloat(component.basePrice);
            const sale = parseFloat(component.salePrice);
            if (base > sale) {
                return Math.round(((base - sale) / base) * 100);
            }
        }
        return 0;
    }

    formatComponentOption(component, componentType) {
        const name = component.title || component.name || '';
        const price = this.getComponentPrice(component);
        const discount = this.getComponentDiscount(component);

        let optionText = name;

        // Add debug info (save count) if debug mode is enabled
        if (this.debugMode) {
            optionText += ` <span style="color: #fbbf24; font-weight: bold;">[${component.saveCount || 0} saves]</span>`;
        }

        // Add key specs to option text
        const specs = this.getKeySpecs(component, componentType);
        if (specs) {
            optionText += ` (${specs})`;
        }

        // Add pricing info
        if (price > 0) {
            if (discount > 0) {
                const basePrice = parseFloat(component.basePrice);
                optionText += ` - <span style="color: #e74c3c;">$${price.toFixed(2)}</span> <span style="text-decoration: line-through; color: #888;">$${basePrice.toFixed(2)}</span> <span style="color: #27ae60; font-weight: bold;">-${discount}%</span>`;
            } else {
                optionText += ` - $${price.toFixed(2)}`;
            }
        }

        return optionText;
    }

    getKeySpecs(component, componentType) {
        switch (componentType) {
            case 'gpu':
                const specs = [];
                if (component.memorySize) specs.push(`${component.memorySize}GB`);
                if (component.memoryType) specs.push(component.memoryType);
                if (component.manufacturer) specs.push(component.manufacturer);
                return specs.join(', ');
            
            case 'cpu':
                const cpuSpecs = [];
                if (component.cores) cpuSpecs.push(`${component.cores}C`);
                if (component.threads) cpuSpecs.push(`${component.threads}T`);
                if (component.baseClockSpeed) cpuSpecs.push(`${component.baseClockSpeed}GHz`);
                if (component.manufacturer) cpuSpecs.push(component.manufacturer);
                return cpuSpecs.join(', ');
            
            case 'motherboard':
                const mbSpecs = [];
                if (component.formFactor) mbSpecs.push(component.formFactor);
                return mbSpecs.join(', ');
            
            case 'ram':
                const ramSpecs = [];
                if (component.memoryType) ramSpecs.push(component.memoryType);
                if (component.capacity) ramSpecs.push(component.capacity);
                if (component.speed) ramSpecs.push(component.speed);
                return ramSpecs.join(', ');
            
            case 'cooler':
                const coolerSpecs = [];
                if (component.coolerType) coolerSpecs.push(component.coolerType);
                if (component.radiatorSize) coolerSpecs.push(component.radiatorSize);
                if (component.performanceTier) coolerSpecs.push(component.performanceTier);
                return coolerSpecs.join(', ');

            case 'psu':
                // No specs needed - wattage, certification, and modularity are shown in columns
                return '';

            default:
                return '';
        }
    }

    populateBuilderCpuSelector() {
        this.sortAndFilterBuilderComponents('cpu');
    }

    populateBuilderMotherboardSelector() {
        this.sortAndFilterBuilderComponents('motherboard');
    }

    populateBuilderRamSelector() {
        this.sortAndFilterBuilderComponents('ram');
    }

    populateBuilderCoolerSelector() {
        this.sortAndFilterBuilderComponents('cooler');
    }

    populateBuilderPsuSelector() {
        this.sortAndFilterBuilderComponents('psu');
    }

    selectBuilderComponent(componentType, value, componentObj = null) {
        if (!value && !componentObj) return;
        
        let component = componentObj;
        if (!component) {
            const index = parseInt(value);
            
            switch (componentType) {
                case 'gpu':
                    component = this.allGPUs[index];
                    break;
                case 'cpu':
                    component = this.allCPUs[index];
                    break;
                case 'motherboard':
                    component = this.allMotherboards[index];
                    break;
                case 'ram':
                    component = this.allRAM[index];
                    break;
                case 'cooler':
                    component = this.allCoolers[index];
                    break;
                case 'psu':
                    component = this.allPSUs[index];
                    break;
            }
        }
        
        if (component) {
            this.currentBuild[componentType] = component;
            this.updateComponentDisplay(componentType, component);
            this.updateTotalPrice();
            this.checkCompatibility();
            this.updateBuildActions();
            console.log('About to call updateBuildStatistics from selectComponent');
            this.updateBuildStatistics();

            // If a CPU was selected, re-render motherboards to show compatibility
            if (componentType === 'cpu' && this.currentTab === 'motherboard') {
                this.renderParts();
            }
        }
    }

    updateComponentDisplay(componentType, component) {
        const nameElement = document.getElementById(`builder${componentType.charAt(0).toUpperCase() + componentType.slice(1)}Name`);
        const specsElement = document.getElementById(`builder${componentType.charAt(0).toUpperCase() + componentType.slice(1)}Specs`);
        const detailsElement = document.getElementById(`builder${componentType.charAt(0).toUpperCase() + componentType.slice(1)}Details`);
        const priceElement = document.getElementById(`${componentType}Price`);
        const selectedDiv = document.getElementById(`selectedBuilder${componentType.charAt(0).toUpperCase() + componentType.slice(1)}`);
        const removeBtn = document.getElementById(`remove${componentType.charAt(0).toUpperCase() + componentType.slice(1)}Btn`);

        // Update component display
        nameElement.textContent = component.title || component.name || `Unknown ${componentType}`;
        specsElement.textContent = this.getComponentSpecs(component, componentType);
        
        // Update detailed information
        if (detailsElement) {
            detailsElement.innerHTML = this.getDetailedComponentInfo(component, componentType);
        }
        
        // Update price with sale support
        const price = component.currentPrice || component.salePrice || component.basePrice || component.price || 0;
        const discount = this.getComponentDiscount(component);
        
        if (discount > 0) {
            const basePrice = parseFloat(component.basePrice);
            priceElement.innerHTML = `<span style="color: #e74c3c;">$${price.toFixed(2)}</span> <span style="text-decoration: line-through; color: #888; font-size: 0.9em;">$${basePrice.toFixed(2)}</span> <span style="color: #27ae60; font-weight: bold; font-size: 0.8em;">-${discount}%</span>`;
        } else {
            priceElement.textContent = price ? `$${parseFloat(price).toFixed(2)}` : '$0.00';
        }
        
        // Show selected component and remove button
        selectedDiv.style.display = 'block';
        removeBtn.style.display = 'inline-block';
    }

    getDetailedComponentInfo(component, componentType) {
        const details = [];
        
        switch (componentType) {
            case 'gpu':
                if (component.manufacturer) details.push(`<strong>Brand:</strong> ${component.manufacturer}`);
                if (component.memorySize && component.memoryType) details.push(`<strong>Memory:</strong> ${component.memorySize}GB ${component.memoryType}`);
                if (component.baseClock) details.push(`<strong>Base Clock:</strong> ${component.baseClock}MHz`);
                if (component.boostClock) details.push(`<strong>Boost Clock:</strong> ${component.boostClock}MHz`);
                if (component.powerConsumption) details.push(`<strong>Power:</strong> ${component.powerConsumption}W`);
                if (component.rayTracing) details.push(`<strong>Ray Tracing:</strong> ${component.rayTracing ? 'Yes' : 'No'}`);
                break;
                
            case 'cpu':
                if (component.manufacturer) details.push(`<strong>Brand:</strong> ${component.manufacturer}`);
                if (component.cores && component.threads) details.push(`<strong>Core/Threads:</strong> ${component.cores}C/${component.threads}T`);
                if (component.baseClockSpeed) details.push(`<strong>Base Clock:</strong> ${component.baseClockSpeed}GHz`);
                if (component.boostClockSpeed) details.push(`<strong>Boost Clock:</strong> ${component.boostClockSpeed}GHz`);
                if (component.cache) details.push(`<strong>Cache:</strong> ${component.cache}`);
                if (component.tdp) details.push(`<strong>TDP:</strong> ${component.tdp}W`);
                if (component.socket) details.push(`<strong>Socket:</strong> ${component.socket}`);
                break;
                
            case 'motherboard':
                if (component.manufacturer) details.push(`<strong>Brand:</strong> ${component.manufacturer}`);
                if (component.socket) details.push(`<strong>Socket:</strong> ${component.socket}`);
                if (component.chipset) details.push(`<strong>Chipset:</strong> ${component.chipset}`);
                if (component.formFactor) details.push(`<strong>Form Factor:</strong> ${component.formFactor}`);
                if (component.memoryType) details.push(`<strong>Memory Support:</strong> ${component.memoryType}`);
                if (component.maxMemory) details.push(`<strong>Max Memory:</strong> ${component.maxMemory}GB`);
                if (component.ramSlots) details.push(`<strong>Memory Slots:</strong> ${component.ramSlots}`);
                break;
                
            case 'ram':
                if (component.manufacturer) details.push(`<strong>Brand:</strong> ${component.manufacturer}`);
                if (component.memoryType) details.push(`<strong>Type:</strong> ${component.memoryType}`);
                if (component.capacity) details.push(`<strong>Capacity:</strong> ${component.capacity}`);
                if (component.speed) details.push(`<strong>Speed:</strong> ${component.speed}`);
                if (component.kitConfiguration) details.push(`<strong>Kit:</strong> ${component.kitConfiguration}`);
                if (component.latency) details.push(`<strong>Latency:</strong> ${component.latency}`);
                if (component.specifications?.rgb) details.push(`<strong>RGB:</strong> Yes`);
                break;
                
            case 'cooler':
                if (component.manufacturer) details.push(`<strong>Brand:</strong> ${component.manufacturer}`);
                if (component.coolerType) details.push(`<strong>Type:</strong> ${component.coolerType}`);
                if (component.radiatorSize) details.push(`<strong>Radiator:</strong> ${component.radiatorSize}`);
                if (component.fanSize) details.push(`<strong>Fan Size:</strong> ${component.fanSize}`);
                if (component.performanceTier) details.push(`<strong>Tier:</strong> ${component.performanceTier}`);
                if (component.socketCompatibility && component.socketCompatibility.length > 0) {
                    details.push(`<strong>Sockets:</strong> ${component.socketCompatibility.join(', ')}`);
                }
                if (component.specifications?.rgb) details.push(`<strong>RGB:</strong> Yes`);
                break;
                
            case 'psu':
                if (component.manufacturer) details.push(`<strong>Brand:</strong> ${component.manufacturer}`);
                if (component.wattage) details.push(`<strong>Wattage:</strong> ${component.wattage}W`);
                if (component.certification) details.push(`<strong>Efficiency:</strong> 80+ ${component.certification}`);
                if (component.modularity) details.push(`<strong>Modularity:</strong> ${component.modularity}`);
                if (component.formFactor) details.push(`<strong>Form Factor:</strong> ${component.formFactor.toUpperCase()}`);
                if (component.railConfig) details.push(`<strong>Rails:</strong> ${component.railConfig.replace(/_/g, ' ')}`);
                break;
        }
        
        // Add URL if available
        if (component.sourceUrl || component.url) {
            details.push(`<strong>Link:</strong> <a href="${component.sourceUrl || component.url}" target="_blank">View on Amazon</a>`);
        }
        
        return details.length > 0 ? `<div class="component-detailed-specs">${details.join('<br>')}</div>` : '';
    }

    getComponentSpecs(component, componentType) {
        let specs = [];
        
        switch (componentType) {
            case 'gpu':
                // VRAM is now in its own column, no specs needed
                break;
            case 'cpu':
                if (component.cores) specs.push(`${component.cores} cores`);
                if (component.threads) specs.push(`${component.threads} threads`);
                if (component.baseClockSpeed) specs.push(`${component.baseClockSpeed}GHz base`);
                if (component.manufacturer) specs.push(component.manufacturer);
                break;
            case 'motherboard':
                if (component.formFactor) specs.push(component.formFactor);
                break;
            case 'ram':
                if (component.memoryType) specs.push(component.memoryType);
                if (component.capacity) specs.push(component.capacity);
                if (component.speed) specs.push(component.speed);
                break;
            case 'cooler':
                // No specs needed - type is shown in column
                break;
            case 'psu':
                // No specs needed - wattage, certification, and modularity are shown in columns
                break;
        }
        
        return specs.join(' • ') || 'No specifications available';
    }

    getGpuPerformance(component) {
        // Extract GPU model from component name or model field
        // Strip trademark/registered symbols that break matching (e.g. "RTX™ 5080" → "RTX 5080")
        const rawName = component.name || component.title || component.model || '';
        const name = rawName.replace(/[\u2122\u00AE]/g, '').replace(/\s+/g, ' ');

        // Sort benchmark keys by length (longest first) to match more specific models first
        // This ensures "RX 7900 XTX" matches before "RX 7900"
        const sortedModels = Object.entries(this.gpuBenchmarks)
            .sort((a, b) => b[0].length - a[0].length);

        // Try to match the GPU model name with our benchmark data
        for (const [model, score] of sortedModels) {
            if (name.includes(model)) {
                // Normalize the score (divide by max value of 205.5 - RTX 5090)
                const maxScore = 197.5;
                return score / maxScore;
            }
        }

        return null; // No benchmark found
    }

    getCpuPerformance(component) {
        // Use the singleCorePerformance field from the database
        if (component.singleCorePerformance) {
            // Normalize the score (divide by max value of 100 - Intel Core Ultra 9)
            const maxScore = 100;
            return component.singleCorePerformance / maxScore;
        }
        return null; // No performance data available
    }

    getCpuMultiThreadPerformance(component) {
        // Use the multiThreadPerformance field from the database
        if (component.multiThreadPerformance) {
            // Normalize the score (divide by 100 - AMD Ryzen 9 7950X as baseline)
            // This allows Threadripper 7980X (200) to show as 200%
            const baselineScore = 100;
            return component.multiThreadPerformance / baselineScore;
        }
        return null; // No performance data available
    }

    getDiscountColor(discount) {
        // Gradient from yellow (#ffd700) to red (#ff0000)
        // Yellow at 0-10%, transitioning to red at 50%+
        const percentage = Math.min(discount, 50) / 50; // Cap at 50% for full red

        // RGB values for yellow (255, 215, 0) and red (255, 0, 0)
        const r = 255;
        const g = Math.round(215 * (1 - percentage));
        const b = 0;

        return `rgb(${r}, ${g}, ${b})`;
    }

    getPerformanceColor(performancePercent) {
        // Gradient from dark maroon to bright red
        // Dark maroon at 0%, bright red at 100%
        const percentage = Math.min(Math.max(performancePercent, 0), 100) / 100;

        // RGB values: Dark maroon (100, 0, 20) to Bright red (255, 0, 0)
        const r = Math.round(100 + (155 * percentage));
        const g = 0;
        const b = Math.round(20 * (1 - percentage));

        return `rgb(${r}, ${g}, ${b})`;
    }

    removeBuilderComponent(componentType) {
        // Set component to null in build
        this.currentBuild[componentType] = null;

        // Capitalize the component type for element IDs
        const capitalizedType = componentType.charAt(0).toUpperCase() + componentType.slice(1);

        // Hide selected component display
        const selectedDiv = document.getElementById(`selectedBuilder${capitalizedType}`);
        if (selectedDiv) {
            selectedDiv.style.display = 'none';
            selectedDiv.classList.remove('component-selected');
            // Clear the content
            selectedDiv.innerHTML = '';
            // Remove stock cooler attribute if it exists
            selectedDiv.removeAttribute('data-stock-cooler');
        }

        // Show the select button again
        const selectBtn = document.getElementById(`builder${capitalizedType}SelectBtn`);
        if (selectBtn) {
            selectBtn.style.display = 'flex';
        }

        // Hide remove button
        const removeBtn = document.getElementById(`remove${capitalizedType}Btn`);
        if (removeBtn) {
            removeBtn.style.display = 'none';
        }

        // Reset price if price element exists
        const priceElement = document.getElementById(`${componentType}Price`);
        if (priceElement) {
            priceElement.textContent = '$0.00';
        }

        // If removing CPU that had a stock cooler, also remove the stock cooler display
        if (componentType === 'cpu') {
            const coolerDiv = document.getElementById('selectedBuilderCooler');
            if (coolerDiv && coolerDiv.getAttribute('data-stock-cooler') === 'true') {
                this.removeBuilderComponent('cooler');
            }
            // If there's a custom cooler selected, refresh its display to remove incompatibility styling
            else if (this.currentBuild.cooler) {
                this.updateBuilderComponentDisplay('cooler', this.currentBuild.cooler);
            }
        }

        // If removing motherboard, refresh CPU, RAM, case, and cooler to remove incompatibility styling
        if (componentType === 'motherboard') {
            if (this.currentBuild.cpu) {
                this.updateBuilderComponentDisplay('cpu', this.currentBuild.cpu);
            }
            if (this.currentBuild.ram) {
                this.updateBuilderComponentDisplay('ram', this.currentBuild.ram);
            }
            if (this.currentBuild.case) {
                this.updateBuilderComponentDisplay('case', this.currentBuild.case);
            }
            if (this.currentBuild.cooler) {
                this.updateBuilderComponentDisplay('cooler', this.currentBuild.cooler);
            }
        }

        this.updateTotalPrice();
        this.checkCompatibility();
        this.updateBuildActions();
        this.updateComponentPositions();
        console.log('About to call updateBuildStatistics from removeBuilderComponent');
        this.updateBuildStatistics();
    }

    addStorageSection() {
        console.log('=== addStorageSection called ===');
        // Find the next disabled storage section and enable it
        for (let i = 2; i <= 7; i++) {
            // Use querySelector to find the section even if it's been moved in the DOM
            const section = document.querySelector(`#storageSection${i}`);
            console.log(`Checking storageSection${i}:`, section ? 'exists' : 'null', section?.classList.contains('disabled') ? 'disabled' : 'enabled');
            if (section && section.classList.contains('disabled')) {
                // Enable this section
                console.log(`Enabling storageSection${i}`);
                section.classList.remove('disabled');
                section.style.display = ''; // Clear any display:none
                console.log(`After enabling - display:`, section.style.display, 'classList:', Array.from(section.classList));

                // Update which plus buttons are visible
                this.updateStoragePlusButtons();

                // Update component positions
                console.log('Calling updateComponentPositions...');
                this.updateComponentPositions();

                break;
            }
        }
        console.log('=== addStorageSection complete ===');
    }

    updateStoragePlusButtons() {
        // Hide all plus buttons first
        for (let i = 1; i <= 7; i++) {
            const plusBtn = document.querySelector(`#addStorageBtn${i}`);
            if (plusBtn) {
                plusBtn.style.display = 'none';
            }
        }

        // Find the last visible storage section and show its plus button
        let lastVisibleSection = 1;
        for (let i = 7; i >= 1; i--) {
            const section = document.querySelector(`#storageSection${i}`);
            if (section && !section.classList.contains('disabled')) {
                lastVisibleSection = i;
                break;
            }
        }

        // Show plus button on the last visible section (unless it's section 7)
        if (lastVisibleSection < 7) {
            const plusBtn = document.querySelector(`#addStorageBtn${lastVisibleSection}`);
            if (plusBtn) {
                plusBtn.style.display = 'flex';
            }
        }
    }

    closeStorageSection(storageNumber) {
        // Get all visible storage sections
        const visibleSections = [];
        for (let i = 1; i <= 6; i++) {
            const section = document.getElementById(`storageSection${i}`);
            if (section && !section.classList.contains('disabled')) {
                visibleSections.push(i);
            }
        }

        // Find the index of the section being closed
        const closingIndex = visibleSections.indexOf(storageNumber);
        if (closingIndex === -1) return; // Section not found or already hidden

        // Move all components from sections after this one up by one position
        for (let i = closingIndex; i < visibleSections.length - 1; i++) {
            const currentSectionNum = visibleSections[i];
            const nextSectionNum = visibleSections[i + 1];

            // Get component types
            const currentType = currentSectionNum === 1 ? 'storage' : `storage${currentSectionNum}`;
            const nextType = nextSectionNum === 1 ? 'storage' : `storage${nextSectionNum}`;

            // Move component from next section to current section
            if (this.currentBuild[nextType]) {
                this.currentBuild[currentType] = this.currentBuild[nextType];
                this.updateBuilderComponentDisplay(currentType, this.currentBuild[currentType]);
            } else {
                // Clear current section if next section is empty
                this.currentBuild[currentType] = null;
                const selectedDiv = document.getElementById(`selectedBuilder${this.capitalizeFirst(currentType)}`);
                const selectBtn = document.getElementById(`builder${this.capitalizeFirst(currentType)}SelectBtn`);
                const removeBtn = document.getElementById(`remove${this.capitalizeFirst(currentType)}Btn`);

                if (selectedDiv) selectedDiv.style.display = 'none';
                if (selectBtn) selectBtn.style.display = 'block';
                if (removeBtn) removeBtn.style.display = 'none';
            }
        }

        // Clear the last visible section and hide it
        const lastSectionNum = visibleSections[visibleSections.length - 1];
        const lastType = lastSectionNum === 1 ? 'storage' : `storage${lastSectionNum}`;
        this.currentBuild[lastType] = null;

        // Clear UI for last section
        const selectedDiv = document.getElementById(`selectedBuilder${this.capitalizeFirst(lastType)}`);
        const selectBtn = document.getElementById(`builder${this.capitalizeFirst(lastType)}SelectBtn`);
        const removeBtn = document.getElementById(`remove${this.capitalizeFirst(lastType)}Btn`);

        if (selectedDiv) selectedDiv.style.display = 'none';
        if (selectBtn) selectBtn.style.display = 'block';
        if (removeBtn) removeBtn.style.display = 'none';

        // Hide the last visible section (unless it's section 1)
        if (lastSectionNum !== 1) {
            const lastSection = document.getElementById(`storageSection${lastSectionNum}`);
            if (lastSection) {
                lastSection.classList.add('disabled');
            }
        }

        // Update which plus buttons are visible
        this.updateStoragePlusButtons();

        // Update total price and component positions
        this.updateTotalPrice();
        this.updateComponentPositions();
    }

    addAddonSection() {
        // Find the next disabled addon section and enable it
        for (let i = 2; i <= 6; i++) {
            const section = document.getElementById(`addonSection${i}`);
            if (section && section.classList.contains('disabled')) {
                // Enable this section
                section.classList.remove('disabled');
                section.style.display = ''; // Clear any display:none

                // Update which plus buttons are visible
                this.updateAddonPlusButtons();

                // Update component positions
                this.updateComponentPositions();

                break;
            }
        }
    }

    updateAddonPlusButtons() {
        // Hide all plus buttons first
        for (let i = 1; i <= 6; i++) {
            const plusBtn = document.getElementById(`addAddonBtn${i}`);
            if (plusBtn) {
                plusBtn.style.display = 'none';
            }
        }

        // Find the last visible addon section and show its plus button
        let lastVisibleSection = 1;
        for (let i = 6; i >= 1; i--) {
            const section = document.getElementById(`addonSection${i}`);
            if (section && !section.classList.contains('disabled')) {
                lastVisibleSection = i;
                break;
            }
        }

        // Show plus button on the last visible section (unless it's section 6)
        if (lastVisibleSection < 6) {
            const plusBtn = document.getElementById(`addAddonBtn${lastVisibleSection}`);
            if (plusBtn) {
                plusBtn.style.display = 'flex';
            }
        }
    }

    closeAddonSection(addonNumber) {
        // Get all visible addon sections
        const visibleSections = [];
        for (let i = 1; i <= 6; i++) {
            const section = document.getElementById(`addonSection${i}`);
            if (section && !section.classList.contains('disabled')) {
                visibleSections.push(i);
            }
        }

        // Find the index of the section being closed
        const closingIndex = visibleSections.indexOf(addonNumber);
        if (closingIndex === -1) return; // Section not found or already hidden

        // Move all components from sections after this one up by one position
        for (let i = closingIndex; i < visibleSections.length - 1; i++) {
            const currentSectionNum = visibleSections[i];
            const nextSectionNum = visibleSections[i + 1];

            // Get component types
            const currentType = currentSectionNum === 1 ? 'addon' : `addon${currentSectionNum}`;
            const nextType = nextSectionNum === 1 ? 'addon' : `addon${nextSectionNum}`;

            // Move component from next section to current section
            if (this.currentBuild[nextType]) {
                this.currentBuild[currentType] = this.currentBuild[nextType];
                this.updateBuilderComponentDisplay(currentType, this.currentBuild[currentType]);
            } else {
                // Clear current section if next section is empty
                this.currentBuild[currentType] = null;
                const selectedDiv = document.getElementById(`selectedBuilder${this.capitalizeFirst(currentType)}`);
                const selectBtn = document.getElementById(`builder${this.capitalizeFirst(currentType)}SelectBtn`);
                const removeBtn = document.getElementById(`remove${this.capitalizeFirst(currentType)}Btn`);

                if (selectedDiv) selectedDiv.style.display = 'none';
                if (selectBtn) selectBtn.style.display = 'block';
                if (removeBtn) removeBtn.style.display = 'none';
            }
        }

        // Clear the last visible section and hide it
        const lastSectionNum = visibleSections[visibleSections.length - 1];
        const lastType = lastSectionNum === 1 ? 'addon' : `addon${lastSectionNum}`;
        this.currentBuild[lastType] = null;

        // Clear UI for last section
        const selectedDiv = document.getElementById(`selectedBuilder${this.capitalizeFirst(lastType)}`);
        const selectBtn = document.getElementById(`builder${this.capitalizeFirst(lastType)}SelectBtn`);
        const removeBtn = document.getElementById(`remove${this.capitalizeFirst(lastType)}Btn`);

        if (selectedDiv) selectedDiv.style.display = 'none';
        if (selectBtn) selectBtn.style.display = 'block';
        if (removeBtn) removeBtn.style.display = 'none';

        // Hide the last visible section (unless it's section 1)
        if (lastSectionNum !== 1) {
            const lastSection = document.getElementById(`addonSection${lastSectionNum}`);
            if (lastSection) {
                lastSection.classList.add('disabled');
            }
        }

        // Update which plus buttons are visible
        this.updateAddonPlusButtons();

        // Update total price and component positions
        this.updateTotalPrice();
        this.updateComponentPositions();
    }

    updateTotalPrice() {
        let total = 0;

        // Check if cooler is a stock cooler (FREE)
        const coolerDiv = document.getElementById('selectedBuilderCooler');
        const isStockCooler = coolerDiv && coolerDiv.getAttribute('data-stock-cooler') === 'true';

        Object.entries(this.currentBuild).forEach(([componentType, component]) => {
            if (component) {
                // Skip cooler price if it's a stock cooler
                if (componentType === 'cooler' && isStockCooler) {
                    return; // Don't add to total
                }

                const price = component.currentPrice || component.salePrice || component.basePrice || component.price || 0;

                // Apply quantity multiplier for RAM and GPU
                const quantity = (componentType === 'ram' || componentType === 'gpu') ? (component.quantity || 1) : 1;

                total += (parseFloat(price) || 0) * quantity;
            }
        });

        this.totalPrice = total;
        document.getElementById('totalPrice').textContent = total.toFixed(2);

        // Update header with component count
        const componentCount = Object.values(this.currentBuild).filter(component => component !== null).length;
        const el = document.getElementById('totalParts'); if (el) el.textContent = componentCount;
    }

    checkCompatibility() {
        const results = document.getElementById('compatibilityResults');
        const compatibilityIcon = document.getElementById('compatibilityIcon');
        const issues = [];

        const { cpu, motherboard, ram, cooler, psu, gpu, case: pcCase } = this.currentBuild;

        // Check CPU and Motherboard socket compatibility
        if (cpu && motherboard) {
            if (cpu.socket && motherboard.socket && cpu.socket !== motherboard.socket) {
                issues.push(`⚠️ CPU socket (${cpu.socket}) doesn't match motherboard socket (${motherboard.socket})`);
            }
        }

        // Check RAM and Motherboard compatibility
        if (ram && motherboard) {
            // Check DDR type compatibility (simplified)
            const ramType = ram.memoryType || '';
            const mbRamSupport = motherboard.specifications?.memoryType || motherboard.memoryType || '';

            if (ramType && mbRamSupport && !mbRamSupport.includes(ramType)) {
                issues.push(`⚠️ RAM type (${ramType}) may not be compatible with motherboard`);
            }
        }

        // Check Motherboard and Case form factor compatibility
        if (motherboard && pcCase) {
            const caseFormFactors = pcCase.formFactor || [];
            const caseFormFactorArray = Array.isArray(caseFormFactors) ? caseFormFactors : [caseFormFactors];
            const motherboardFormFactor = motherboard.formFactor || '';

            if (motherboardFormFactor && caseFormFactorArray.length > 0) {
                let caseCompatible = false;

                // Normalize motherboard form factor (handle all variants - remove hyphens and normalize spaces)
                const moboFFUpper = motherboardFormFactor.toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();

                // Check motherboard type (order matters: check more specific first)
                const isMoboITX = moboFFUpper.includes('ITX') && !moboFFUpper.includes('ATX');
                const isMoboMicroATX = moboFFUpper.includes('MATX') || moboFFUpper.includes('MICROATX');
                const isMoboEATX = moboFFUpper.includes('EATX');
                const isMoboATX = !isMoboITX && !isMoboMicroATX && !isMoboEATX && moboFFUpper.includes('ATX');

                for (const caseFF of caseFormFactorArray) {
                    const caseFFUpper = caseFF.toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();

                    // Check case type (order matters: check more specific first)
                    const isCaseITX = caseFFUpper.includes('ITX') && !caseFFUpper.includes('ATX');
                    const isCaseMicroATX = caseFFUpper.includes('MATX') || caseFFUpper.includes('MICROATX');
                    const isCaseEATX = caseFFUpper.includes('EATX');
                    const isCaseATX = !isCaseITX && !isCaseMicroATX && !isCaseEATX && caseFFUpper.includes('ATX');

                    // E-ATX case accepts all motherboards
                    if (isCaseEATX) {
                        caseCompatible = true;
                        break;
                    }
                    // ATX case: compatible with ATX, mATX, ITX
                    else if (isCaseATX && (isMoboATX || isMoboMicroATX || isMoboITX)) {
                        caseCompatible = true;
                        break;
                    }
                    // mATX/Micro ATX case: compatible with mATX, ITX
                    else if (isCaseMicroATX && (isMoboMicroATX || isMoboITX)) {
                        caseCompatible = true;
                        break;
                    }
                    // ITX case: compatible with ITX only
                    else if (isCaseITX && isMoboITX) {
                        caseCompatible = true;
                        break;
                    }
                }

                if (!caseCompatible) {
                    const caseFFDisplay = caseFormFactorArray.join('/');
                    issues.push(`⚠️ Motherboard (${motherboardFormFactor}) is too large for case (${caseFFDisplay})`);
                }
            }
        }

        // Check PSU wattage using accurate calculation
        if (psu) {
            const psuWattage = parseInt(psu.wattage) || 0;
            const wattageInfo = this.calculateEstimatedWattage();
            const estimatedPower = wattageInfo.total;

            if (psuWattage > 0 && estimatedPower > psuWattage * 0.8) { // 80% rule
                issues.push(`⚠️ PSU wattage (${psuWattage}W) may be insufficient for estimated system power (~${estimatedPower}W)`);
            }
        }

        // Check cooler and CPU compatibility
        if (cooler && cpu) {
            const cpuSocket = cpu.socket || '';
            const coolerSockets = cooler.socketCompatibility || [];

            if (cpuSocket && coolerSockets.length > 0 && !coolerSockets.includes(cpuSocket)) {
                issues.push(`⚠️ Cooler may not support CPU socket (${cpuSocket})`);
            }
        }

        // Check GPU length vs case form factor
        if (gpu && pcCase) {
            const gpuLength = gpu.length || 0;
            const caseFormFactors = pcCase.formFactor || [];
            const caseFormFactorArray = Array.isArray(caseFormFactors) ? caseFormFactors : [caseFormFactors];

            if (gpuLength > 0) {
                const isITXCase = caseFormFactorArray.some(ff => {
                    const u = ff.toUpperCase().replace(/-/g, '').replace(/\s+/g, '');
                    return u.includes('ITX') && !u.includes('ATX');
                });
                const isMATXCase = caseFormFactorArray.some(ff => {
                    const u = ff.toUpperCase().replace(/-/g, '').replace(/\s+/g, '');
                    return u.includes('MATX') || u.includes('MICROATX');
                });

                const gpuName = gpu.gpuModel || gpu.name || 'Selected GPU';

                if (isITXCase && gpuLength > 300) {
                    issues.push(`⚠️ ${gpuName} (≈${gpuLength}mm) may be too long for many ITX cases (typical limit: 300mm)`);
                } else if (isMATXCase && gpuLength > 340) {
                    issues.push(`⚠️ ${gpuName} (≈${gpuLength}mm) may be too long for most Micro-ATX cases (typical limit: 340mm)`);
                }
            }
        }

        // Update compatibility icon and heading text based on issues
        const compatibilityHeading = document.getElementById('compatibilityCheckHeading');
        if (issues.length > 0) {
            // Show warning icon and change text when there are issues
            if (compatibilityHeading) {
                compatibilityHeading.innerHTML = '<i class="fas fa-exclamation-triangle" style="color: #f59e0b;"></i> Compatibility Problem';
            }
        } else {
            // Show check icon and normal text when no issues
            if (compatibilityHeading) {
                compatibilityHeading.innerHTML = '<i class="fas fa-check-circle"></i> Compatibility Check';
            }
        }

        // Display results and update styling
        if (issues.length === 0) {
            // Remove warning class and add success class
            results.classList.remove('has-warnings');
            results.classList.add('no-warnings');

            if (Object.values(this.currentBuild).some(component => component !== null)) {
                results.innerHTML = '<p class="compatibility-message success">✅ No compatibility issues detected</p>';
            } else {
                results.innerHTML = '<p class="compatibility-message">Select components to check compatibility</p>';
            }
        } else {
            // Add warning class and remove success class
            results.classList.remove('no-warnings');
            results.classList.add('has-warnings');

            results.innerHTML = `<div class="compatibility-issues">${issues.map(issue => `<p class="compatibility-issue">${issue}</p>`).join('')}</div>`;
        }

        // Update wattage display in build summary
        this.updateBuildSummaryWattage();
    }

    updateBuildSummaryWattage() {
        const wattageContainer = document.getElementById('buildSummaryWattageInfo');
        const totalWattageEl = document.getElementById('buildSummaryTotalWattage');
        const breakdownEl = document.getElementById('buildSummaryWattageBreakdown');

        // Calculate wattage
        const wattageInfo = this.calculateEstimatedWattage();

        // Show/hide the wattage section based on whether components are selected
        const hasComponents = Object.values(this.currentBuild).some(component => component !== null);

        if (wattageContainer) {
            wattageContainer.style.display = hasComponents ? 'block' : 'none';

            // Check if power is sufficient
            let isSufficient = true;
            if (this.currentBuild.psu && this.currentBuild.psu.wattage) {
                const psuWattage = parseInt(this.currentBuild.psu.wattage) || 0;
                isSufficient = wattageInfo.total <= psuWattage * 0.8;
            }

            // Update bolt icon color
            const boltIcon = wattageContainer.querySelector('.fas.fa-bolt');
            if (boltIcon) {
                boltIcon.style.color = isSufficient ? '#10b981' : '#f59e0b';
            }

            // Update info icon color
            const infoIcon = wattageContainer.querySelector('.fas.fa-info-circle');
            if (infoIcon) {
                infoIcon.style.color = isSufficient ? '#10b981' : '#f59e0b';
            }
        }

        // Update values
        if (totalWattageEl) {
            // Check if PSU is selected to show "estimatedW / psuW" format
            if (this.currentBuild.psu && this.currentBuild.psu.wattage) {
                const psuWattage = parseInt(this.currentBuild.psu.wattage) || 0;
                totalWattageEl.textContent = `${wattageInfo.total}W / ${psuWattage}W`;
            } else {
                totalWattageEl.textContent = `${wattageInfo.total}W`;
            }
        }

        if (breakdownEl) {
            if (wattageInfo.breakdown.length === 0) {
                breakdownEl.textContent = 'No components selected';
            } else {
                breakdownEl.innerHTML = wattageInfo.breakdown.join('<br>');
            }
        }
    }

    estimateSystemPower() {
        let estimatedWatts = 0;
        
        // Basic power estimation (very simplified)
        if (this.currentBuild.gpu) {
            // Rough GPU power estimates based on typical values
            estimatedWatts += 250; // Average mid-range GPU
        }
        
        if (this.currentBuild.cpu) {
            estimatedWatts += 100; // Average CPU
        }
        
        // Add base system power (motherboard, RAM, storage, fans)
        estimatedWatts += 100;
        
        return estimatedWatts;
    }

    updateBuildActions() {
        const hasComponents = Object.values(this.currentBuild).some(component => component !== null);
        const shareBtn = document.getElementById('shareBuildBtn');
        const amazonBtn = document.getElementById('addToAmazonCartBtn');

        if (shareBtn) {
            shareBtn.disabled = !hasComponents;
        }

        if (amazonBtn) {
            amazonBtn.disabled = !hasComponents;
        }
    }

    async updateBuildStatistics() {
        const statisticsSection = document.getElementById('buildStatisticsSection');
        if (!statisticsSection) {
            console.log('Statistics section element not found');
            return;
        }

        // Check if all required components are selected
        const hasAllRequired = this.currentBuild.gpu &&
                               this.currentBuild.cpu &&
                               this.currentBuild.ram &&
                               this.currentBuild.psu &&
                               this.currentBuild.motherboard &&
                               this.currentBuild.case &&
                               this.currentBuild.storage;

        console.log('Build Statistics Check:', {
            hasAllRequired,
            gpu: !!this.currentBuild.gpu,
            cpu: !!this.currentBuild.cpu,
            ram: !!this.currentBuild.ram,
            psu: !!this.currentBuild.psu,
            motherboard: !!this.currentBuild.motherboard,
            case: !!this.currentBuild.case,
            storage: !!this.currentBuild.storage
        });

        if (hasAllRequired) {
            console.log('Showing statistics section');
            statisticsSection.classList.remove('hidden');

            // Hide contact info from build box, show in stats box
            const buildBoxContactInfo = document.getElementById('buildBoxContactInfo');
            const statsBoxContactInfo = document.getElementById('statsBoxContactInfo');
            if (buildBoxContactInfo) buildBoxContactInfo.style.display = 'none';
            if (statsBoxContactInfo) statsBoxContactInfo.style.display = 'block';

            // Render GPU statistics
            console.log('Rendering GPU chart...');
            await this.renderBuildStatisticsChart('gpu', 'buildGpuStatisticsCanvas', this.currentBuild.gpu, false);

            // Render CPU Single-Thread statistics
            console.log('Rendering CPU Single-Thread chart...');
            await this.renderBuildStatisticsChart('cpu', 'buildCpuSingleStatisticsCanvas', this.currentBuild.cpu, false);

            // Render CPU Multi-Thread statistics
            console.log('Rendering CPU Multi-Thread chart...');
            await this.renderBuildStatisticsChart('cpu', 'buildCpuMultiStatisticsCanvas', this.currentBuild.cpu, true);

            // Render Price Distribution Pie Chart
            console.log('Rendering Price Distribution chart...');
            this.renderPriceDistributionChart();
        } else {
            console.log('Hiding statistics section - not all components selected');
            statisticsSection.classList.add('hidden');

            // Show contact info in build box, hide from stats box
            const buildBoxContactInfo = document.getElementById('buildBoxContactInfo');
            const statsBoxContactInfo = document.getElementById('statsBoxContactInfo');
            if (buildBoxContactInfo) buildBoxContactInfo.style.display = 'block';
            if (statsBoxContactInfo) statsBoxContactInfo.style.display = 'none';
        }
    }

    async renderBuildStatisticsChart(componentType, canvasId, selectedComponent, useMultiThread = false) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.error(`Canvas element ${canvasId} not found`);
            return;
        }

        const isCpuMode = componentType === 'cpu';
        const ctx = canvas.getContext('2d');
        const width = 600;
        const height = 400;

        canvas.width = width;
        canvas.height = height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Show loading message
        ctx.fillStyle = '#666';
        ctx.font = '14px sans-serif';
        ctx.textAlign = 'center';
        const loadingMessage = isCpuMode ? 'Loading CPUs...' : 'Loading GPUs...';
        ctx.fillText(loadingMessage, width / 2, height / 2);

        // Fetch all products
        let allIndividualProducts = [];
        try {
            const endpoint = isCpuMode ? '/api/parts/cpus' : '/api/parts/gpus?groupByModel=false';
            const response = await fetch(endpoint);
            if (!response.ok) {
                throw new Error(`Failed to fetch ${componentType}: ${response.status}`);
            }
            allIndividualProducts = await response.json();
        } catch (error) {
            console.error(`Error fetching ${componentType}:`, error);
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#e74c3c';
            ctx.fillText(`Error loading ${componentType} data`, width / 2, height / 2);
            return;
        }

        // Clear canvas again
        ctx.clearRect(0, 0, width, height);

        // Collect data points
        const dataPoints = [];
        allIndividualProducts.forEach(product => {
            let performance;
            if (isCpuMode) {
                // Use multi-thread or single-thread performance based on parameter
                performance = useMultiThread ? this.getCpuMultiThreadPerformance(product) : this.getCpuPerformance(product);
            } else {
                performance = this.getGpuPerformance(product);
            }

            const price = parseFloat(product.salePrice) || parseFloat(product.currentPrice) || parseFloat(product.basePrice) || parseFloat(product.price) || 0;

            if (performance !== null && performance > 0 && price > 0) {
                dataPoints.push({
                    name: product.title || product.name || 'Unknown',
                    performance: performance,
                    price: price,
                    product: product
                });
            }
        });

        if (dataPoints.length === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`No ${componentType} performance data available`, width / 2, height / 2);
            return;
        }

        // Set up padding and chart dimensions
        const padding = { top: 20, right: 40, bottom: 60, left: 80 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Find min/max values
        const maxPerformance = Math.max(...dataPoints.map(p => p.performance));
        const minPerformance = Math.min(...dataPoints.map(p => p.performance));
        const maxPrice = Math.max(...dataPoints.map(p => p.price));
        const minPrice = Math.min(...dataPoints.map(p => p.price));

        // Round price range for cleaner axis
        const priceRange = maxPrice - minPrice;
        const priceStep = Math.ceil(priceRange / 5 / 100) * 100;
        const roundedMinPrice = Math.floor(minPrice / 100) * 100;
        const roundedMaxPrice = roundedMinPrice + (priceStep * 5);

        // Draw grid lines and Y-axis labels (price)
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#666';
        ctx.font = '11px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let i = 0; i <= 5; i++) {
            const price = roundedMinPrice + (priceStep * i);
            const y = height - padding.bottom - (chartHeight / 5) * i;

            // Grid line
            ctx.strokeStyle = '#e0e0e0';
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            // Y-axis label
            ctx.fillStyle = '#666';
            ctx.fillText('$' + price.toFixed(0), padding.left - 10, y);
        }

        // Draw grid lines and X-axis labels (performance)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        for (let i = 0; i <= 5; i++) {
            const performance = minPerformance + ((maxPerformance - minPerformance) / 5) * i;
            const x = padding.left + (chartWidth / 5) * i;

            // Grid line
            ctx.strokeStyle = '#e0e0e0';
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, height - padding.bottom);
            ctx.stroke();

            // X-axis label (show as percentage)
            ctx.fillStyle = '#666';
            ctx.fillText((performance * 100).toFixed(0) + '%', x, height - padding.bottom + 5);
        }

        // Draw axes
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.stroke();

        // Draw points
        dataPoints.forEach(point => {
            const x = padding.left + ((point.performance - minPerformance) / (maxPerformance - minPerformance)) * chartWidth;
            const y = height - padding.bottom - ((point.price - roundedMinPrice) / (roundedMaxPrice - roundedMinPrice)) * chartHeight;

            // Color based on value proposition
            const performancePerDollar = point.performance / point.price;
            const maxPerformancePerDollar = Math.max(...dataPoints.map(p => p.performance / p.price));
            const ratio = performancePerDollar / maxPerformancePerDollar;

            const r = Math.round(255 * (1 - ratio));
            const g = Math.round(255 * ratio);
            const b = 100;

            // Draw point
            ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, 2 * Math.PI);
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
            ctx.lineWidth = 1;
            ctx.stroke();
        });

        // Draw selected component with yellow star
        if (selectedComponent) {
            let selectedPerformance;
            if (isCpuMode) {
                // Use the same performance metric as the chart
                selectedPerformance = useMultiThread ? this.getCpuMultiThreadPerformance(selectedComponent) : this.getCpuPerformance(selectedComponent);
            } else {
                selectedPerformance = this.getGpuPerformance(selectedComponent);
            }

            const selectedPrice = parseFloat(selectedComponent.salePrice) || parseFloat(selectedComponent.currentPrice) || parseFloat(selectedComponent.basePrice) || parseFloat(selectedComponent.price) || 0;

            if (selectedPerformance !== null && selectedPerformance > 0 && selectedPrice > 0) {
                const x = padding.left + ((selectedPerformance - minPerformance) / (maxPerformance - minPerformance)) * chartWidth;
                const y = height - padding.bottom - ((selectedPrice - roundedMinPrice) / (roundedMaxPrice - roundedMinPrice)) * chartHeight;

                // Draw yellow star
                this.drawStar(ctx, x, y, 12, '#FFD700', '#FFA500');
            }
        }

        // Draw axis labels
        ctx.fillStyle = '#333';
        ctx.font = 'bold 12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // X-axis label
        ctx.fillText('Performance (%)', width / 2, height - 20);

        // Y-axis label
        ctx.save();
        ctx.translate(20, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Price (USD)', 0, 0);
        ctx.restore();
    }

    drawStar(ctx, cx, cy, radius, fillColor, strokeColor) {
        const spikes = 5;
        const outerRadius = radius;
        const innerRadius = radius / 2;

        ctx.beginPath();
        ctx.moveTo(cx, cy - outerRadius);

        for (let i = 0; i < spikes * 2; i++) {
            const angle = (Math.PI / spikes) * i - Math.PI / 2;
            const r = i % 2 === 0 ? outerRadius : innerRadius;
            const x = cx + Math.cos(angle) * r;
            const y = cy + Math.sin(angle) * r;
            ctx.lineTo(x, y);
        }

        ctx.closePath();
        ctx.fillStyle = fillColor;
        ctx.fill();
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = 2;
        ctx.stroke();
    }

    renderPriceDistributionChart() {
        const canvas = document.getElementById('buildPriceDistributionCanvas');
        if (!canvas) {
            console.error('Price distribution canvas not found');
            return;
        }

        const ctx = canvas.getContext('2d');
        const width = 550;
        const height = 550;

        canvas.width = width;
        canvas.height = height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Build data array with actual component names
        const chartData = [];
        let totalPrice = 0;

        // Helper function to get component name
        const getComponentName = (component) => {
            return component.name || component.title || component.model || '';
        };

        // GPU
        if (this.currentBuild.gpu) {
            const quantity = this.currentBuild.gpu.quantity || 1;
            const price = (parseFloat(this.currentBuild.gpu.salePrice) || parseFloat(this.currentBuild.gpu.currentPrice) || parseFloat(this.currentBuild.gpu.basePrice) || 0) * quantity;
            if (price > 0) {
                const baseName = getComponentName(this.currentBuild.gpu);
                const displayName = quantity > 1 ? `${baseName} (x${quantity})` : baseName;
                chartData.push({
                    name: displayName,
                    value: price,
                    color: '#FF6384', // Red/Pink
                    type: 'GPU'
                });
                totalPrice += price;
            }
        }

        // CPU
        if (this.currentBuild.cpu) {
            const price = parseFloat(this.currentBuild.cpu.salePrice) || parseFloat(this.currentBuild.cpu.currentPrice) || parseFloat(this.currentBuild.cpu.basePrice) || 0;
            if (price > 0) {
                chartData.push({
                    name: getComponentName(this.currentBuild.cpu),
                    value: price,
                    color: '#36A2EB', // Blue
                    type: 'CPU'
                });
                totalPrice += price;
            }
        }

        // Motherboard
        if (this.currentBuild.motherboard) {
            const price = parseFloat(this.currentBuild.motherboard.salePrice) || parseFloat(this.currentBuild.motherboard.currentPrice) || parseFloat(this.currentBuild.motherboard.basePrice) || 0;
            if (price > 0) {
                chartData.push({
                    name: getComponentName(this.currentBuild.motherboard),
                    value: price,
                    color: '#FFCE56', // Yellow
                    type: 'Motherboard'
                });
                totalPrice += price;
            }
        }

        // RAM
        if (this.currentBuild.ram) {
            const quantity = this.currentBuild.ram.quantity || 1;
            const price = (parseFloat(this.currentBuild.ram.salePrice) || parseFloat(this.currentBuild.ram.currentPrice) || parseFloat(this.currentBuild.ram.basePrice) || 0) * quantity;
            if (price > 0) {
                const baseName = getComponentName(this.currentBuild.ram);
                const displayName = quantity > 1 ? `${baseName} (x${quantity})` : baseName;
                chartData.push({
                    name: displayName,
                    value: price,
                    color: '#4BC0C0', // Teal
                    type: 'RAM'
                });
                totalPrice += price;
            }
        }

        // Cooler
        if (this.currentBuild.cooler) {
            const price = parseFloat(this.currentBuild.cooler.salePrice) || parseFloat(this.currentBuild.cooler.currentPrice) || parseFloat(this.currentBuild.cooler.basePrice) || 0;
            if (price > 0) {
                chartData.push({
                    name: getComponentName(this.currentBuild.cooler),
                    value: price,
                    color: '#9966FF', // Purple
                    type: 'Cooler'
                });
                totalPrice += price;
            }
        }

        // PSU
        if (this.currentBuild.psu) {
            const price = parseFloat(this.currentBuild.psu.salePrice) || parseFloat(this.currentBuild.psu.currentPrice) || parseFloat(this.currentBuild.psu.basePrice) || 0;
            if (price > 0) {
                chartData.push({
                    name: getComponentName(this.currentBuild.psu),
                    value: price,
                    color: '#FF9F40', // Orange
                    type: 'PSU'
                });
                totalPrice += price;
            }
        }

        // Case
        if (this.currentBuild.case) {
            const price = parseFloat(this.currentBuild.case.salePrice) || parseFloat(this.currentBuild.case.currentPrice) || parseFloat(this.currentBuild.case.basePrice) || 0;
            if (price > 0) {
                chartData.push({
                    name: getComponentName(this.currentBuild.case),
                    value: price,
                    color: '#E91E63', // Pink
                    type: 'Case'
                });
                totalPrice += price;
            }
        }

        // Storage - combine all storage slots
        const storageItems = [];
        ['storage', 'storage2', 'storage3', 'storage4', 'storage5', 'storage6'].forEach(storageType => {
            if (this.currentBuild[storageType]) {
                const price = parseFloat(this.currentBuild[storageType].salePrice) || parseFloat(this.currentBuild[storageType].currentPrice) || parseFloat(this.currentBuild[storageType].basePrice) || 0;
                if (price > 0) {
                    storageItems.push({
                        name: getComponentName(this.currentBuild[storageType]),
                        price: price
                    });
                }
            }
        });

        // Add each storage item separately
        storageItems.forEach((item, index) => {
            chartData.push({
                name: item.name,
                value: item.price,
                color: index === 0 ? '#C9CBCF' : `hsl(${200 + index * 20}, 10%, ${70 - index * 5}%)`, // Gray shades
                type: 'Storage'
            });
            totalPrice += item.price;
        });

        // Add-ons - combine all addon slots
        const addonItems = [];
        ['addon', 'addon2', 'addon3', 'addon4', 'addon5', 'addon6'].forEach(addonType => {
            if (this.currentBuild[addonType]) {
                const price = parseFloat(this.currentBuild[addonType].salePrice) || parseFloat(this.currentBuild[addonType].currentPrice) || parseFloat(this.currentBuild[addonType].basePrice) || 0;
                if (price > 0) {
                    addonItems.push({
                        name: getComponentName(this.currentBuild[addonType]),
                        price: price
                    });
                }
            }
        });

        // Add each addon item separately
        addonItems.forEach((item, index) => {
            chartData.push({
                name: item.name,
                value: item.price,
                color: index === 0 ? '#26C6DA' : `hsl(${180 + index * 15}, 60%, ${60 - index * 5}%)`, // Teal shades
                type: 'Add-on'
            });
            totalPrice += item.price;
        });

        if (totalPrice === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '14px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('No price data available', width / 2, height / 2);
            return;
        }

        // Draw title first
        ctx.fillStyle = '#333';
        ctx.font = 'bold 18px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`Total Build Cost: $${totalPrice.toFixed(2)}`, width / 2, 25);

        // Create D3 treemap layout
        const padding = 40;
        const titleHeight = 40;
        const treemapWidth = width - (padding * 2);
        const treemapHeight = height - (padding * 2) - titleHeight;

        // Create hierarchy from data
        const root = d3.hierarchy({ children: chartData })
            .sum(d => d.value)
            .sort((a, b) => b.value - a.value);

        // Create treemap layout
        const treemap = d3.treemap()
            .size([treemapWidth, treemapHeight])
            .padding(3)
            .round(true);

        // Compute the layout
        treemap(root);

        // Helper function to truncate text to fit width
        const truncateText = (text, maxWidth, font) => {
            ctx.font = font;
            if (ctx.measureText(text).width <= maxWidth) {
                return text;
            }

            // Try to truncate and add ellipsis
            let truncated = text;
            while (truncated.length > 0 && ctx.measureText(truncated + '...').width > maxWidth) {
                truncated = truncated.slice(0, -1);
            }
            return truncated.length > 0 ? truncated + '...' : '';
        };

        // Draw rectangles using D3 computed layout
        root.leaves().forEach(node => {
            const rect = {
                x: node.x0 + padding,
                y: node.y0 + titleHeight + padding,
                width: node.x1 - node.x0,
                height: node.y1 - node.y0
            };

            // Draw rectangle
            ctx.fillStyle = node.data.color;
            ctx.fillRect(rect.x, rect.y, rect.width, rect.height);

            // Draw border
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 3;
            ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);

            // Calculate percentage
            const percentage = (node.data.value / totalPrice) * 100;

            // Draw label and percentage if rectangle is large enough
            if (rect.width > 80 && rect.height > 50) {
                const centerX = rect.x + rect.width / 2;
                const centerY = rect.y + rect.height / 2;

                // Draw component label (truncated to fit)
                ctx.fillStyle = '#fff';
                ctx.font = 'bold 14px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const truncatedName = truncateText(node.data.name, rect.width - 10, 'bold 14px sans-serif');
                ctx.fillText(truncatedName, centerX, centerY - 16);

                // Draw price and percentage on same line
                ctx.font = 'bold 15px sans-serif';
                const pricePercentText = `$${node.data.value.toFixed(0)} (${percentage.toFixed(1)}%)`;
                ctx.fillText(pricePercentText, centerX, centerY + 2);

                // Draw component type below in small text
                ctx.font = '11px sans-serif';
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fillText(node.data.type, centerX, centerY + 18);
            } else if (rect.width > 60 && rect.height > 30) {
                // Just show percentage for smaller rectangles
                const centerX = rect.x + rect.width / 2;
                const centerY = rect.y + rect.height / 2;

                ctx.fillStyle = '#fff';
                ctx.font = 'bold 12px sans-serif';
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(`${percentage.toFixed(0)}%`, centerX, centerY);
            }
        });
    }

    clearBuild() {
        // Reset all components
        Object.keys(this.currentBuild).forEach(componentType => {
            this.removeBuilderComponent(componentType);
        });

        // Hide additional storage sections (keep only first storage slot visible)
        for (let i = 2; i <= 6; i++) {
            const section = document.getElementById(`storageSection${i}`);
            if (section) {
                section.classList.add('disabled');
            }
        }

        // Hide additional addon sections (keep only first addon slot visible)
        for (let i = 2; i <= 6; i++) {
            const section = document.getElementById(`addonSection${i}`);
            if (section) {
                section.classList.add('disabled');
            }
        }

        // Update storage plus buttons visibility
        this.updateStoragePlusButtons();

        // Update addon plus buttons visibility
        this.updateAddonPlusButtons();

        this.updateTotalPrice();
        this.checkCompatibility();
        this.updateBuildActions();
    }

    async shareBuild() {
        // Create a compact representation with IDs and quantities
        const buildData = {};

        Object.entries(this.currentBuild).forEach(([type, component]) => {
            if (component !== null) {
                // Debug GPU being saved
                if (type === 'gpu') {
                    console.log('=== SAVING GPU TO SHARE LINK ===');
                    console.log('GPU Component:', {
                        _id: component._id,
                        title: component.title,
                        name: component.name,
                        manufacturer: component.manufacturer
                    });
                    console.log('================================');
                }

                // For RAM and GPU, save ID and quantity
                if ((type === 'ram' || type === 'gpu') && component.quantity) {
                    buildData[type] = {
                        id: component._id,
                        qty: component.quantity
                    };
                } else {
                    // For other components, just save ID
                    buildData[type] = component._id;
                }
            }
        });

        console.log('Build data being saved:', buildData);

        // Increment save counts for all components
        await this.incrementComponentSaveCounts();

        // Encode the build data as a URL parameter
        const jsonString = JSON.stringify(buildData);
        const encodedBuild = btoa(jsonString);
        const shareURL = `${window.location.origin}${window.location.pathname}?build=${encodedBuild}`;

        // Copy to clipboard with fallback for mobile browsers
        const copyToClipboard = async (text) => {
            // Try modern Clipboard API first
            if (navigator.clipboard && window.isSecureContext) {
                try {
                    await navigator.clipboard.writeText(text);
                    return true;
                } catch (err) {
                    console.log('Clipboard API failed, using fallback:', err);
                }
            }

            // Fallback method for mobile browsers (especially iOS Safari)
            const textArea = document.createElement('textarea');
            textArea.value = text;
            textArea.style.position = 'fixed';
            textArea.style.left = '-999999px';
            textArea.style.top = '-999999px';
            document.body.appendChild(textArea);
            textArea.focus();
            textArea.select();

            try {
                const successful = document.execCommand('copy');
                textArea.remove();
                return successful;
            } catch (err) {
                console.error('Fallback copy failed:', err);
                textArea.remove();
                return false;
            }
        };

        // Use the copy function
        copyToClipboard(shareURL).then(success => {
            if (success) {
                // Show success message with a styled alert
                const componentCount = Object.keys(buildData).length;
                alert(`✅ Share link copied to clipboard!\n\nTotal: $${this.totalPrice.toFixed(2)}\nComponents: ${componentCount}\n\nAnyone with this link can view and use your build!`);
            } else {
                alert('Failed to copy link. Please try again.');
            }
        });
    }

    async addToAmazonCart() {
        // Collect all components with their quantities
        const cartItems = [];

        Object.entries(this.currentBuild).forEach(([type, component]) => {
            if (component !== null) {
                const amazonUrl = component.sourceUrl || component.url || '';

                // Extract ASIN from Amazon URL
                const asin = this.extractASIN(amazonUrl);

                if (asin) {
                    // Get quantity for RAM and GPU, default to 1 for others
                    const quantity = (type === 'ram' || type === 'gpu') ? (component.quantity || 1) : 1;

                    cartItems.push({
                        asin,
                        quantity,
                        name: component.name || component.title || '',
                        type
                    });
                    console.log(`Adding to cart: ${type} - ASIN: ${asin}, Qty: ${quantity}`);
                } else {
                    console.warn(`No ASIN found for ${type}:`, component.name || component.title);
                }
            }
        });

        if (cartItems.length === 0) {
            alert('No Amazon products found in your build. Make sure your components have Amazon links.');
            return;
        }

        console.log(`Preparing Amazon cart with ${cartItems.length} products, ${cartItems.reduce((sum, item) => sum + item.quantity, 0)} total items`);

        // Increment save counts for all components
        await this.incrementComponentSaveCounts();

        // Build Amazon cart URL using official format
        // Format: https://www.amazon.com/gp/aws/cart/add.html?AssociateTag=XXX&ASIN.1=XXX&Quantity.1=1&ASIN.2=YYY&Quantity.2=2
        const params = new URLSearchParams();

        // Add Amazon Associate Tag (required for add-to-cart functionality)
        // TODO: Replace 'qhezpc-20' with your actual Amazon Associates tag
        params.append('AssociateTag', 'qhezpc-20');

        cartItems.forEach((item, index) => {
            const itemNum = index + 1;
            params.append(`ASIN.${itemNum}`, item.asin);
            params.append(`Quantity.${itemNum}`, item.quantity);
        });

        const cartUrl = `https://www.amazon.com/gp/aws/cart/add.html?${params.toString()}`;

        console.log('Amazon cart URL:', cartUrl);
        console.log('Cart items:', cartItems);

        // Open the cart URL in a new window
        window.open(cartUrl, '_blank');
    }

    extractASIN(url) {
        if (!url) return null;

        // Amazon ASIN is typically 10 characters: uppercase letters and numbers
        // Common URL patterns:
        // https://www.amazon.com/dp/B08N5WRWNW
        // https://www.amazon.com/gp/product/B08N5WRWNW
        // https://www.amazon.com/Product-Name/dp/B08N5WRWNW

        const patterns = [
            /\/dp\/([A-Z0-9]{10})/,           // /dp/ASIN
            /\/gp\/product\/([A-Z0-9]{10})/,  // /gp/product/ASIN
            /\/product\/([A-Z0-9]{10})/,      // /product/ASIN
            /[?&]th=([A-Z0-9]{10})/           // ?th=ASIN or &th=ASIN
        ];

        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match && match[1]) {
                return match[1];
            }
        }

        return null;
    }

    async incrementComponentSaveCounts() {
        try {
            const components = [];

            // Collect all components from currentBuild
            Object.entries(this.currentBuild).forEach(([type, component]) => {
                if (component !== null && component._id) {
                    components.push({
                        type: type,
                        id: component._id
                    });
                }
            });

            if (components.length === 0) {
                console.log('No components to increment save counts for');
                return;
            }

            console.log(`Incrementing save counts for ${components.length} components:`, components);

            const response = await fetch('/api/components/increment-saves', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ components })
            });

            if (response.ok) {
                const result = await response.json();
                console.log(`✅ Updated save counts for ${result.updated} of ${result.total} components`);
            } else {
                console.error('Failed to update save counts:', response.status);
            }
        } catch (error) {
            console.error('Error incrementing save counts:', error);
        }
    }

    async loadBuildFromURL() {
        const urlParams = new URLSearchParams(window.location.search);
        let buildParam = urlParams.get('build');

        if (!buildParam) {
            return; // No build to load
        }

        try {
            // Clean up the build parameter - remove any whitespace or invalid characters
            buildParam = buildParam.trim().replace(/\s/g, '');

            // Remove any trailing commas or other invalid characters that might have been added
            buildParam = buildParam.replace(/[^A-Za-z0-9+/=]/g, '');

            console.log('Raw build parameter length:', buildParam.length);
            console.log('First 50 chars:', buildParam.substring(0, 50));
            console.log('Last 10 chars:', buildParam.substring(buildParam.length - 10));

            // Decode the build data (simple base64 decode, IDs only)
            const buildData = JSON.parse(atob(buildParam));

            console.log('Loading build from URL:', buildData);

            // Track failed components
            const failedComponents = [];

            // Load each component by its ID
            for (const [type, componentId] of Object.entries(buildData)) {
                if (componentId) {
                    const success = await this.loadAndAddComponentById(type, componentId);
                    if (!success) {
                        failedComponents.push(type);
                    }
                }
            }

            // Enable additional storage/addon sections that have components
            // Check which storage/addon slots have components and enable their sections
            for (let i = 2; i <= 7; i++) {
                const storageKey = i === 1 ? 'storage' : `storage${i}`;
                if (this.currentBuild[storageKey]) {
                    const section = document.querySelector(`#storageSection${i}`);
                    if (section && section.classList.contains('disabled')) {
                        section.classList.remove('disabled');
                        section.style.display = '';
                    }
                }
            }

            for (let i = 2; i <= 6; i++) {
                const addonKey = i === 1 ? 'addon' : `addon${i}`;
                if (this.currentBuild[addonKey]) {
                    const section = document.querySelector(`#addonSection${i}`);
                    if (section && section.classList.contains('disabled')) {
                        section.classList.remove('disabled');
                        section.style.display = '';
                    }
                }
            }

            // Update plus button visibility to show additional storage/addon slots if needed
            this.updateStoragePlusButtons();
            this.updateAddonPlusButtons();
            this.updateComponentPositions();

            // Re-render GPU if it exists to show quantity badge (which requires motherboard to be loaded)
            if (this.currentBuild.gpu && this.currentBuild.motherboard) {
                console.log('Re-rendering GPU to display quantity badge');
                this.updateBuilderComponentDisplay('gpu', this.currentBuild.gpu);
            }

            // Re-render RAM if it exists to ensure quantity badge displays correctly
            if (this.currentBuild.ram) {
                console.log('Re-rendering RAM to ensure quantity badge displays');
                this.updateBuilderComponentDisplay('ram', this.currentBuild.ram);
            }

            // If CPU has stock cooler and no cooler is selected, show stock cooler
            if (this.currentBuild.cpu && this.currentBuild.cpu.coolerIncluded === true && !this.currentBuild.cooler) {
                console.log('CPU includes stock cooler and no cooler selected, showing stock cooler');
                this.showStockCooler(this.currentBuild.cpu);
            }

            // Update build statistics if all required components are present
            this.updateBuildStatistics();

            // Log success message and show warning if components failed
            const componentCount = Object.keys(buildData).length;
            const successCount = componentCount - failedComponents.length;

            if (failedComponents.length > 0) {
                console.warn(`⚠️ ${failedComponents.length} component(s) could not be loaded: ${failedComponents.join(', ')}`);
                console.log(`✅ ${successCount} of ${componentCount} components loaded from shared link.`);

                // Show user-friendly message
                const failedList = failedComponents.map(type => type.charAt(0).toUpperCase() + type.slice(1)).join(', ');
                alert(`Build loaded with warnings:\n\n${successCount} of ${componentCount} components were restored.\n\nThe following components could not be found and were skipped:\n${failedList}\n\nThese components may have been removed from the database.`);
            } else {
                console.log(`✅ Build loaded successfully! ${componentCount} components restored from shared link.`);
            }

        } catch (error) {
            console.error('Error loading build from URL:', error);
            console.error('Build parameter that caused error:', buildParam);

            if (error.name === 'InvalidCharacterError') {
                alert('Failed to load build from link.\n\nThe share link appears to be corrupted or incomplete.\n\nPlease make sure you copied the entire link, including all characters.');
            } else {
                alert('Failed to load build from link. The link may be invalid or corrupted.\n\nError: ' + error.message);
            }
        }
    }

    async loadAndAddComponentById(type, componentData) {
        try {
            // Handle both string IDs and {id, qty} objects
            let componentId, quantity;
            if (typeof componentData === 'object' && componentData.id) {
                componentId = componentData.id;
                quantity = componentData.qty || 1;
            } else {
                componentId = componentData;
                quantity = 1;
            }

            // Extract base type (e.g., 'storage' from 'storage2', 'addon' from 'addon3')
            const baseType = type.replace(/\d+$/, '');

            console.log(`Loading ${type} (base: ${baseType}) with ID: ${componentId}, qty: ${quantity}`);

            // Map component type to the appropriate array
            let componentArray;
            switch(baseType) {
                case 'cpu':
                    componentArray = this.allCPUs;
                    break;
                case 'gpu':
                    componentArray = this.allGPUs;
                    break;
                case 'motherboard':
                    componentArray = this.allMotherboards;
                    break;
                case 'ram':
                    componentArray = this.allRAM;
                    break;
                case 'psu':
                    componentArray = this.allPSUs;
                    break;
                case 'case':
                    componentArray = this.allCases;
                    break;
                case 'cooler':
                    componentArray = this.allCoolers;
                    break;
                case 'storage':
                    componentArray = this.allStorage;
                    break;
                case 'addon':
                    componentArray = this.allAddons;
                    break;
                default:
                    console.error(`Unknown component type: ${type}`);
                    return false;
            }

            // For GPUs, fetch individual GPU details from API to get full product info
            let component;
            if (baseType === 'gpu') {
                try {
                    console.log(`Fetching individual GPUs to find ID: ${componentId}`);
                    const response = await fetch('/api/parts/gpus?groupByModel=false');
                    if (response.ok) {
                        const allIndividualGPUs = await response.json();
                        console.log(`Fetched ${allIndividualGPUs.length} individual GPUs from API`);

                        // Log all GPU IDs to help debug
                        const gpuIds = allIndividualGPUs.map(g => g._id);
                        console.log('Available GPU IDs:', gpuIds.slice(0, 10), '...(showing first 10)');

                        component = allIndividualGPUs.find(g => g._id === componentId);
                        if (component) {
                            console.log('✅ Found individual GPU from API with full details');
                        } else {
                            console.log('⚠️ GPU ID not found in individual GPUs API response');
                            console.log(`Looking for: ${componentId}`);
                            console.log(`Trying grouped array which has ${componentArray.length} GPUs`);
                            component = componentArray.find(c => c._id === componentId);
                            if (component) {
                                console.log('✅ Found GPU in grouped array');
                            } else {
                                console.log('❌ GPU not found in grouped array either');

                                // Try fuzzy ID matching - find GPUs with IDs that differ by only 1-2 characters
                                const potentialMatches = allIndividualGPUs.filter(g => {
                                    const gId = g._id || '';
                                    // Check if IDs are same length and differ by only a few characters
                                    if (gId.length === componentId.length) {
                                        let differences = 0;
                                        for (let i = 0; i < gId.length; i++) {
                                            if (gId[i] !== componentId[i]) differences++;
                                        }
                                        return differences <= 2; // Allow up to 2 character differences
                                    }
                                    return false;
                                });

                                if (potentialMatches.length > 0) {
                                    console.log(`🔍 Found ${potentialMatches.length} GPU(s) with similar IDs:`);
                                    potentialMatches.forEach(match => {
                                        console.log(`  - ${match.title || match.name} (ID: ${match._id})`);
                                    });

                                    // Use the first fuzzy match as fallback
                                    component = potentialMatches[0];
                                    console.log(`✅ Using fuzzy match: ${component.title || component.name}`);
                                } else {
                                    // Try finding by title/name as last resort
                                    const searchTerms = ['RTX 4090', 'ASUS TUF'];
                                    for (const term of searchTerms) {
                                        const match = allIndividualGPUs.find(g =>
                                            (g.title && g.title.includes(term)) ||
                                            (g.name && g.name.includes(term))
                                        );
                                        if (match) {
                                            console.log(`Found potential match by name: ${match.title || match.name} (ID: ${match._id})`);
                                        }
                                    }
                                }
                            }
                        }
                    } else {
                        console.log(`⚠️ API fetch failed with status: ${response.status}`);
                        // Fallback to array lookup if API fails
                        component = componentArray.find(c => c._id === componentId);
                    }
                } catch (error) {
                    console.error('Error fetching individual GPUs:', error);
                    // Fallback to array lookup
                    component = componentArray.find(c => c._id === componentId);
                }
            } else {
                // For non-GPU components, find by ID in the already-loaded array
                component = componentArray.find(c => c._id === componentId);
            }

            if (component) {
                // Clone the component to avoid modifying the original
                const componentCopy = { ...component };

                // Set quantity for RAM and GPU
                if (baseType === 'ram' || baseType === 'gpu') {
                    componentCopy.quantity = quantity;
                }

                // Debug GPU data
                if (type === 'gpu') {
                    console.log('=== LOADING GPU FROM SHARE LINK ===');
                    console.log('GPU component data:', {
                        _id: component._id,
                        title: component.title,
                        name: component.name,
                        imageUrl: component.imageUrl,
                        image: component.image,
                        manufacturer: component.manufacturer
                    });
                    console.log('===================================');
                }

                // Add the component to the build
                this.currentBuild[type] = componentCopy;
                console.log(`✅ Found ${type}, calling updateBuilderComponentDisplay`);
                this.updateBuilderComponentDisplay(type, componentCopy);
                console.log(`✅ Display updated for ${type}`);
                this.updateTotalPrice();
                this.checkCompatibility();
                this.updateBuildActions();
                return true; // Success
            } else {
                console.warn(`Component not found: ${type} with ID ${componentId}`);
                return false; // Component not found
            }
        } catch (error) {
            console.error(`Error loading ${type}:`, error);
            return false; // Error occurred
        }
    }

    handleRamSelection(value) {
        const selectBtn = document.getElementById('selectRamBtn');
        if (value) {
            selectBtn.disabled = false;
            selectBtn.textContent = '✓ Select This RAM';
        } else {
            selectBtn.disabled = true;
            selectBtn.textContent = 'Select This RAM';
        }
    }

    selectRAM() {
        const ramSelect = document.getElementById('ramSelect');
        const selectedValue = ramSelect.value;
        
        if (!selectedValue) return;
        
        const [manufacturer, index] = selectedValue.split('-');
        const ramByManufacturer = {};
        
        this.allRAM.forEach(ram => {
            const mfg = ram.manufacturer || 'Unknown';
            if (!ramByManufacturer[mfg]) {
                ramByManufacturer[mfg] = [];
            }
            ramByManufacturer[mfg].push(ram);
        });
        
        this.selectedRAM = ramByManufacturer[manufacturer][parseInt(index)];
        this.displaySelectedRAM();
    }

    displaySelectedRAM() {
        if (!this.selectedRAM) return;
        
        const selectedRamDiv = document.getElementById('selectedRam');
        const ramName = document.getElementById('selectedRamName');
        const ramSpecs = document.getElementById('selectedRamSpecs');
        const ramPrice = document.getElementById('selectedRamPrice');
        const ramAvailability = document.getElementById('selectedRamAvailability');
        
        // Display RAM information
        ramName.textContent = this.selectedRAM.title || this.selectedRAM.name || 'Unknown RAM';
        
        // Build specs string
        const specsParts = [];
        if (this.selectedRAM.memoryType) specsParts.push(this.selectedRAM.memoryType);
        if (this.selectedRAM.speed) specsParts.push(this.selectedRAM.speed);
        if (this.selectedRAM.capacity) specsParts.push(this.selectedRAM.capacity);
        if (this.selectedRAM.kitConfiguration) specsParts.push(this.selectedRAM.kitConfiguration);
        if (this.selectedRAM.latency) specsParts.push(`${this.selectedRAM.latency} Latency`);
        
        const specs = this.selectedRAM.specifications || {};
        if (specs.rgb) specsParts.push('RGB Lighting');
        if (specs.overclock && specs.overclock !== 'JEDEC') specsParts.push(specs.overclock);
        
        ramSpecs.textContent = specsParts.join(' • ') || 'No specifications available';
        
        // Handle sale pricing display (same logic as PSU cards)
        let priceDisplay = 'Price not available';
        if (this.selectedRAM.isOnSale && this.selectedRAM.basePrice && this.selectedRAM.salePrice) {
            const basePrice = parseFloat(this.selectedRAM.basePrice);
            const salePrice = parseFloat(this.selectedRAM.salePrice);
            if (basePrice > salePrice) {
                const discountPercent = Math.round(((basePrice - salePrice) / basePrice) * 100);
                priceDisplay = `$${salePrice.toFixed(2)} (was $${basePrice.toFixed(2)}, -${discountPercent}%)`;
            } else {
                priceDisplay = `$${salePrice.toFixed(2)}`;
            }
        } else {
            const price = this.selectedRAM.currentPrice || this.selectedRAM.price;
            priceDisplay = price ? `$${parseFloat(price).toFixed(2)}` : 'Price not available';
        }
        ramPrice.textContent = priceDisplay;
        
        ramAvailability.textContent = this.selectedRAM.availability || 'In Stock';
        ramAvailability.className = 'availability ' + (this.selectedRAM.availability === 'In Stock' ? 'in-stock' : 'out-of-stock');
        
        // Hide selector, show selected RAM
        document.querySelector('.ram-selector').style.display = 'none';
        selectedRamDiv.classList.remove('hidden');
    }

    showRamSelector() {
        document.querySelector('.ram-selector').style.display = 'flex';
        document.getElementById('selectedRam').classList.add('hidden');
        
        // Reset selector
        document.getElementById('ramSelect').value = '';
        document.getElementById('selectRamBtn').disabled = true;
    }

    buildAroundRAM() {
        if (!this.selectedRAM) return;
        
        const ramName = this.selectedRAM.title || this.selectedRAM.name;
        const price = this.selectedRAM.price || this.selectedRAM.currentPrice || 0;
        
        alert(`Building PC around: ${ramName}\nPrice: $${price}\n\nPC Building functionality coming soon!`);
        
        // Future implementation could:
        // - Navigate to a PC builder page
        // - Show compatible motherboards based on memory type
        // - Show compatible CPUs that support the memory speed
        // - Calculate optimal system configurations
        // - Suggest matching kit quantities for dual/quad channel
    }

    // Modal functionality for component selection
    setTableHeaders(componentType) {
        const thead = document.querySelector('#componentTable thead tr');
        if (!thead) {
            console.error('Table header not found!');
            return;
        }

        // Define headers for each component type
        const headers = {
            'gpu': [
                { text: 'Component', sort: 'name', icon: true },
                { text: 'VRAM', sort: 'memorySize', icon: true, style: 'width: 140px; min-width: 140px;' },
                { text: 'Release Year', sort: 'releaseYear', icon: true, style: 'width: 120px; min-width: 120px; text-align: center;' },
                { text: 'Performance', sort: 'performance', icon: true, style: 'width: 150px; min-width: 150px;' },
                { text: 'Multi-Thread Performance', sort: 'multiThreadPerformance', icon: true, className: 'cpu-only-column', style: 'display: none;' },
                { text: 'Price', sort: 'salePrice', icon: true, style: 'width: 120px; min-width: 120px;' }
            ],
            'cpu': [
                { text: 'Image', sort: null, icon: false, style: 'width: 100px; min-width: 100px;' },
                { text: 'Component', sort: 'name', icon: true },
                { text: 'Release Year', sort: 'releaseYear', icon: true, style: 'width: 120px; min-width: 120px; text-align: center;' },
                { text: 'Single-Thread Performance', sort: 'performance', icon: true, style: 'width: 180px; min-width: 180px;' },
                { text: 'Multi-Thread Performance', sort: 'multiThreadPerformance', icon: true, className: 'cpu-only-column', style: 'width: 180px; min-width: 180px;' },
                { text: 'Price', sort: 'salePrice', icon: true, style: 'width: 120px; min-width: 120px;' }
            ],
            'motherboard': [
                { text: 'Image', sort: null, icon: false, style: 'width: 100px; min-width: 100px;' },
                { text: 'Component', sort: 'name', icon: true },
                { text: 'Form Factor', sort: 'formFactor', icon: true },
                { text: 'Socket', sort: 'socket', icon: true },
                { text: 'Chipset', sort: 'chipset', icon: true },
                { text: 'DDR', sort: 'memoryType', icon: true },
                { text: 'RAM Slots', sort: 'ramSlots', icon: true },
                { text: 'M.2 Slots', sort: 'm2Slots', icon: true },
                { text: 'PCIe Slots', sort: 'pcieSlots', icon: true },
                { text: 'WiFi', sort: 'wifi', icon: true, style: 'width: 80px; min-width: 80px; text-align: center;' },
                { text: 'Price', sort: 'salePrice', icon: true }
            ],
            'ram': [
                { text: 'Image', sort: null, icon: false, style: 'width: 100px; min-width: 100px;' },
                { text: 'Component', sort: 'name', icon: true },
                { text: 'Type', sort: 'memoryType', icon: true },
                { text: 'Capacity', sort: 'capacity', icon: true },
                { text: 'Speed', sort: 'speed', icon: true },
                { text: 'Price', sort: 'salePrice', icon: true }
            ],
            'cooler': [
                { text: 'Image', sort: null, icon: false, style: 'width: 100px; min-width: 100px;' },
                { text: 'Component', sort: 'name', icon: true },
                { text: 'Type', sort: 'coolerType', icon: true, style: 'width: 120px; min-width: 120px;' },
                { text: 'Price', sort: 'salePrice', icon: true, style: 'width: 120px; min-width: 120px;' }
            ],
            'psu': [
                { text: 'Image', sort: null, icon: false, style: 'width: 100px; min-width: 100px;' },
                { text: 'Component', sort: 'name', icon: true },
                { text: 'Wattage', sort: 'wattage', icon: true },
                { text: 'Certification', sort: 'certification', icon: true },
                { text: 'Modularity', sort: 'modularity', icon: true },
                { text: 'Price', sort: 'salePrice', icon: true }
            ],
            'case': [
                { text: 'Image', sort: null, icon: false, style: 'width: 100px; min-width: 100px;' },
                { text: 'Component', sort: 'name', icon: true },
                { text: 'Form Factor', sort: 'formFactor', icon: true, style: 'width: 140px; min-width: 140px;' },
                { text: 'RGB', sort: 'hasRGB', icon: true, style: 'width: 80px; min-width: 80px;' },
                { text: 'Price', sort: 'salePrice', icon: true, style: 'width: 120px; min-width: 120px;' }
            ],
            'storage': [
                { text: 'Image', sort: null, icon: false, style: 'width: 100px; min-width: 100px;' },
                { text: 'Component', sort: 'name', icon: true },
                { text: 'Type', sort: 'type', icon: true, style: 'width: 140px; min-width: 140px;' },
                { text: 'Capacity', sort: 'capacity', icon: true, style: 'width: 120px; min-width: 120px;' },
                { text: 'Price', sort: 'salePrice', icon: true, style: 'width: 120px; min-width: 120px;' }
            ],
            'storage2': [
                { text: 'Image', sort: null, icon: false, style: 'width: 100px; min-width: 100px;' },
                { text: 'Component', sort: 'name', icon: true },
                { text: 'Type', sort: 'type', icon: true, style: 'width: 140px; min-width: 140px;' },
                { text: 'Capacity', sort: 'capacity', icon: true, style: 'width: 120px; min-width: 120px;' },
                { text: 'Price', sort: 'salePrice', icon: true, style: 'width: 120px; min-width: 120px;' }
            ],
            'storage3': [
                { text: 'Image', sort: null, icon: false, style: 'width: 100px; min-width: 100px;' },
                { text: 'Component', sort: 'name', icon: true },
                { text: 'Type', sort: 'type', icon: true, style: 'width: 140px; min-width: 140px;' },
                { text: 'Capacity', sort: 'capacity', icon: true, style: 'width: 120px; min-width: 120px;' },
                { text: 'Price', sort: 'salePrice', icon: true, style: 'width: 120px; min-width: 120px;' }
            ],
            'storage4': [
                { text: 'Image', sort: null, icon: false, style: 'width: 100px; min-width: 100px;' },
                { text: 'Component', sort: 'name', icon: true },
                { text: 'Type', sort: 'type', icon: true, style: 'width: 140px; min-width: 140px;' },
                { text: 'Capacity', sort: 'capacity', icon: true, style: 'width: 120px; min-width: 120px;' },
                { text: 'Price', sort: 'salePrice', icon: true, style: 'width: 120px; min-width: 120px;' }
            ],
            'storage5': [
                { text: 'Image', sort: null, icon: false, style: 'width: 100px; min-width: 100px;' },
                { text: 'Component', sort: 'name', icon: true },
                { text: 'Type', sort: 'type', icon: true, style: 'width: 140px; min-width: 140px;' },
                { text: 'Capacity', sort: 'capacity', icon: true, style: 'width: 120px; min-width: 120px;' },
                { text: 'Price', sort: 'salePrice', icon: true, style: 'width: 120px; min-width: 120px;' }
            ],
            'storage6': [
                { text: 'Image', sort: null, icon: false, style: 'width: 100px; min-width: 100px;' },
                { text: 'Component', sort: 'name', icon: true },
                { text: 'Type', sort: 'type', icon: true, style: 'width: 140px; min-width: 140px;' },
                { text: 'Capacity', sort: 'capacity', icon: true, style: 'width: 120px; min-width: 120px;' },
                { text: 'Price', sort: 'salePrice', icon: true, style: 'width: 120px; min-width: 120px;' }
            ],
            'addon': [
                { text: 'Image', sort: null, icon: false, style: 'width: 100px; min-width: 100px;' },
                { text: 'Component', sort: 'name', icon: true },
                { text: 'Price', sort: 'salePrice', icon: true, style: 'width: 120px; min-width: 120px;' }
            ],
            'addon2': [
                { text: 'Image', sort: null, icon: false, style: 'width: 100px; min-width: 100px;' },
                { text: 'Component', sort: 'name', icon: true },
                { text: 'Price', sort: 'salePrice', icon: true, style: 'width: 120px; min-width: 120px;' }
            ],
            'addon3': [
                { text: 'Image', sort: null, icon: false, style: 'width: 100px; min-width: 100px;' },
                { text: 'Component', sort: 'name', icon: true },
                { text: 'Price', sort: 'salePrice', icon: true, style: 'width: 120px; min-width: 120px;' }
            ],
            'addon4': [
                { text: 'Image', sort: null, icon: false, style: 'width: 100px; min-width: 100px;' },
                { text: 'Component', sort: 'name', icon: true },
                { text: 'Price', sort: 'salePrice', icon: true, style: 'width: 120px; min-width: 120px;' }
            ],
            'addon5': [
                { text: 'Image', sort: null, icon: false, style: 'width: 100px; min-width: 100px;' },
                { text: 'Component', sort: 'name', icon: true },
                { text: 'Price', sort: 'salePrice', icon: true, style: 'width: 120px; min-width: 120px;' }
            ],
            'addon6': [
                { text: 'Image', sort: null, icon: false, style: 'width: 100px; min-width: 100px;' },
                { text: 'Component', sort: 'name', icon: true },
                { text: 'Price', sort: 'salePrice', icon: true, style: 'width: 120px; min-width: 120px;' }
            ]
        };

        const componentHeaders = headers[componentType] || headers['gpu'];

        thead.innerHTML = componentHeaders.map(h => {
            const className = h.className ? ` class="sortable ${h.className}"` : ' class="sortable"';
            const style = h.style ? ` style="${h.style}"` : '';
            const icon = h.icon ? ' <i class="fas fa-sort"></i>' : '';
            return `<th${className} data-sort="${h.sort}"${style}>${h.text}${icon}</th>`;
        }).join('');
    }

    calculateEstimatedWattage() {
        let totalWattage = 0;
        const breakdown = [];

        // Motherboard: 50W (fixed)
        if (this.currentBuild && this.currentBuild.motherboard) {
            totalWattage += 50;
            breakdown.push('Motherboard: 50W');
        }

        // CPU wattage
        if (this.currentBuild && this.currentBuild.cpu && this.currentBuild.cpu.wattage) {
            const cpuWattage = this.currentBuild.cpu.wattage;
            totalWattage += cpuWattage;
            breakdown.push(`CPU: ${cpuWattage}W`);
        }

        // GPU wattage (stored as tdp on GPU documents, wattage as fallback)
        if (this.currentBuild && this.currentBuild.gpu) {
            const gpuWattage = this.currentBuild.gpu.tdp || this.currentBuild.gpu.wattage;
            if (gpuWattage) {
                totalWattage += gpuWattage;
                breakdown.push(`GPU: ${gpuWattage}W`);
            }
        }

        // RAM wattage: 3W per DDR4 stick, 5W per DDR5 stick
        if (this.currentBuild && this.currentBuild.ram) {
            const ram = this.currentBuild.ram;
            const memoryType = ram.memoryType || '';
            const modules = ram.modules || 2; // Default to 2 sticks if not specified

            let ramWattagePerStick = 3; // Default to DDR4
            if (memoryType.toUpperCase().includes('DDR5')) {
                ramWattagePerStick = 5;
            }

            const ramWattage = ramWattagePerStick * modules;
            totalWattage += ramWattage;
            breakdown.push(`RAM: ${ramWattage}W (${modules}x ${memoryType} @ ${ramWattagePerStick}W each)`);
        }

        // Cooler wattage: 12W for air, 20W for liquid
        if (this.currentBuild && this.currentBuild.cooler) {
            const cooler = this.currentBuild.cooler;
            const coolerType = cooler.coolerType || cooler.type || '';

            let coolerWattage = 12; // Default to air cooler
            let coolerTypeLabel = 'Air';

            // Check if it's a liquid cooler
            if (coolerType.toLowerCase().includes('liquid') ||
                coolerType.toLowerCase().includes('aio') ||
                coolerType.toLowerCase().includes('water')) {
                coolerWattage = 20;
                coolerTypeLabel = 'Liquid';
            }

            totalWattage += coolerWattage;
            breakdown.push(`CPU Cooler: ${coolerWattage}W (${coolerTypeLabel})`);
        }

        // Storage wattage: 5W per storage device
        if (this.currentBuild) {
            const storageSlots = ['storage', 'storage2', 'storage3', 'storage4', 'storage5', 'storage6'];
            let storageCount = 0;

            for (const slot of storageSlots) {
                if (this.currentBuild[slot]) {
                    storageCount++;
                }
            }

            if (storageCount > 0) {
                const storageWattage = storageCount * 5;
                totalWattage += storageWattage;
                breakdown.push(`Storage: ${storageWattage}W (${storageCount}x @ 5W each)`);
            }
        }

        return {
            total: totalWattage,
            breakdown: breakdown
        };
    }

    openComponentModal(componentType) {
        console.log('Opening component modal for:', componentType);
        this.currentModalType = componentType;

        // Reset sort state and filters for fresh modal
        this.currentSortColumn = 'name';
        this.currentSortDirection = 'asc';
        this.activeBadgeFilters.clear();
        this.searchTerm = '';

        // Calculate great value GPUs if opening GPU modal
        if (componentType === 'gpu') {
            this.calculateGreatValueGPUs().then(ids => {
                this.greatValueGpuIds = ids;
                // Refresh the table to show badges
                this.populateComponentTable(componentType);
                // Re-expand the selected GPU row and restore the details panel after re-render
                if (this.currentBuild && this.currentBuild.gpu) {
                    const selectedGpu = this.currentBuild.gpu;
                    setTimeout(() => {
                        this.expandAndSelectGPUsInModal([selectedGpu]);
                        // Restore details panel state
                        if (!this.comparisonComponents || this.comparisonComponents.length === 0) {
                            this.comparisonComponents = [{ component: selectedGpu, componentType: 'gpu', variantIndex: 0 }];
                            this.currentComparisonIndex = 0;
                            this.currentDetailSelection = { component: selectedGpu, componentType: 'gpu', variantIndex: 0 };
                            this.renderComparisonView();
                            const panel = document.getElementById('componentDetailsPanel');
                            if (panel) panel.classList.remove('hidden');
                            const modalContent = document.querySelector('.modal-content');
                            if (modalContent) modalContent.style.setProperty('border-radius', '12px 0 0 12px', 'important');
                        }
                    }, 200);
                }
            });
        }

        // Set modal title
        const titles = {
            'gpu': '<i class="fas fa-desktop"></i> Select Graphics Card',
            'cpu': '<i class="fas fa-microchip"></i> Select Processor',
            'motherboard': '<i class="fas fa-memory"></i> Select Motherboard',
            'ram': '<i class="fas fa-hdd"></i> Select Memory',
            'cooler': '<i class="fas fa-snowflake"></i> Select CPU Cooler',
            'psu': '<i class="fas fa-plug"></i> Select Power Supply',
            'case': '<i class="fas fa-box"></i> Select Case',
            'storage': '<i class="fas fa-database"></i> Select Storage',
            'storage2': '<i class="fas fa-database"></i> Select Storage (2)',
            'storage3': '<i class="fas fa-database"></i> Select Storage (3)',
            'storage4': '<i class="fas fa-database"></i> Select Storage (4)',
            'storage5': '<i class="fas fa-database"></i> Select Storage (5)',
            'storage6': '<i class="fas fa-database"></i> Select Storage (6)',
            'addon': '<i class="fas fa-plus-circle"></i> Select Add-on',
            'addon2': '<i class="fas fa-plus-circle"></i> Select Add-on (2)',
            'addon3': '<i class="fas fa-plus-circle"></i> Select Add-on (3)',
            'addon4': '<i class="fas fa-plus-circle"></i> Select Add-on (4)',
            'addon5': '<i class="fas fa-plus-circle"></i> Select Add-on (5)',
            'addon6': '<i class="fas fa-plus-circle"></i> Select Add-on (6)'
        };

        const modalTitle = document.getElementById('modalTitle');
        if (!modalTitle) {
            console.error('Modal title element not found!');
            return;
        }
        modalTitle.innerHTML = titles[componentType] || 'Select Component';

        // Show/hide View Statistics button (for GPUs, CPUs, RAM, and Storage)
        const statisticsBtn = document.getElementById('viewStatisticsBtn');
        if (statisticsBtn) {
            if (componentType === 'gpu' || componentType === 'cpu' || componentType === 'ram' ||
                componentType === 'storage' || componentType === 'storage2' || componentType === 'storage3' ||
                componentType === 'storage4' || componentType === 'storage5' || componentType === 'storage6') {
                statisticsBtn.classList.remove('hidden');
                statisticsBtn.style.display = '';
            } else {
                statisticsBtn.classList.add('hidden');
                statisticsBtn.style.display = 'none';
            }
        }

        // Show/hide Multi-Thread Performance column (only for CPUs)
        const multiThreadColumns = document.querySelectorAll('.cpu-only-column');
        multiThreadColumns.forEach(col => {
            col.style.display = componentType === 'cpu' ? '' : 'none';
        });

        // Show CPU/RAM compatibility info if selecting motherboard with CPU or RAM selected
        const compatibilityInfoContainer = document.getElementById('compatibilityInfoContainer');
        const cpuCompatibilityInfo = document.getElementById('cpuCompatibilityInfo');
        const cpuChipsetsInfo = document.getElementById('cpuChipsetsInfo');
        const ramTypeCompatInfo = document.getElementById('ramTypeCompatInfo');

        if (componentType === 'motherboard' && this.currentBuild && (this.currentBuild.cpu || this.currentBuild.ram || this.currentBuild.case)) {
            // Hide PSU wattage container for motherboard selection
            const psuWattageInfoContainer = document.getElementById('psuWattageInfoContainer');
            if (psuWattageInfoContainer) psuWattageInfoContainer.style.display = 'none';

            // Show the main compatibility container
            if (compatibilityInfoContainer) {
                compatibilityInfoContainer.style.display = 'block';
            }

            // Show CPU compatibility if CPU is selected
            if (this.currentBuild.cpu) {
                const selectedCpu = this.currentBuild.cpu;
                const cpuName = selectedCpu.name || selectedCpu.title || 'Unknown CPU';
                const chipsets = selectedCpu.supportedChipsets || [];

                document.getElementById('selectedCpuNameInfo').textContent = cpuName;
                document.getElementById('compatibleChipsetsInfo').textContent = chipsets.join(', ');
                if (cpuCompatibilityInfo) cpuCompatibilityInfo.style.display = 'flex';
                if (cpuChipsetsInfo) cpuChipsetsInfo.style.display = 'flex';
            } else {
                if (cpuCompatibilityInfo) cpuCompatibilityInfo.style.display = 'none';
                if (cpuChipsetsInfo) cpuChipsetsInfo.style.display = 'none';
            }

            // Show RAM DDR type compatibility if RAM is selected
            if (this.currentBuild.ram && ramTypeCompatInfo) {
                const selectedRam = this.currentBuild.ram;
                const ramDdrType = selectedRam.memoryType || 'Unknown';

                document.getElementById('selectedRamDdrType').textContent = ramDdrType;
                ramTypeCompatInfo.style.display = 'flex';
            } else if (ramTypeCompatInfo) {
                ramTypeCompatInfo.style.display = 'none';
            }

            // Show case form factor compatibility if case is selected
            const caseFormFactorInfo = document.getElementById('caseFormFactorInfo');
            if (this.currentBuild.case && caseFormFactorInfo) {
                const selectedCase = this.currentBuild.case;
                const caseName = selectedCase.name || selectedCase.title || 'Unknown Case';
                const caseFormFactors = selectedCase.formFactor || [];
                const formFactorArray = Array.isArray(caseFormFactors) ? caseFormFactors : [caseFormFactors];
                const formFactorDisplay = formFactorArray.length > 0 ? formFactorArray.join(', ') : 'Unknown';

                document.getElementById('selectedCaseFormFactor').textContent = `${caseName} (${formFactorDisplay})`;
                caseFormFactorInfo.style.display = 'flex';
            } else if (caseFormFactorInfo) {
                caseFormFactorInfo.style.display = 'none';
            }

            // Set up checkbox event listener for compatibility filtering (for both CPU and RAM)
            const showOnlyCompatibleCheckbox = document.getElementById('showOnlyCompatibleCheckbox');
            if (showOnlyCompatibleCheckbox) {
                // Remove any existing listeners
                showOnlyCompatibleCheckbox.replaceWith(showOnlyCompatibleCheckbox.cloneNode(true));
                const newCheckbox = document.getElementById('showOnlyCompatibleCheckbox');

                newCheckbox.addEventListener('change', () => {
                    this.populateComponentTable(componentType);
                });
            }
        } else if (componentType === 'cpu' && this.currentBuild && this.currentBuild.motherboard) {
            // Hide PSU wattage container for CPU selection
            const psuWattageInfoContainer = document.getElementById('psuWattageInfoContainer');
            if (psuWattageInfoContainer) psuWattageInfoContainer.style.display = 'none';

            // Show CPU socket compatibility if motherboard is selected
            if (compatibilityInfoContainer) {
                compatibilityInfoContainer.style.display = 'block';
            }

            const selectedMotherboard = this.currentBuild.motherboard;
            const motherboardName = selectedMotherboard.name || selectedMotherboard.title || 'Unknown Motherboard';
            const motherboardSocket = selectedMotherboard.socket || selectedMotherboard.socketType || 'Unknown Socket';

            // Update compatibility info for CPU selection
            const selectedCpuLabel = document.getElementById('selectedCpuLabel');
            if (selectedCpuLabel) selectedCpuLabel.textContent = 'Selected Motherboard:';

            document.getElementById('selectedCpuNameInfo').textContent = motherboardName;
            document.getElementById('compatibleChipsetsInfo').textContent = motherboardSocket;

            const compatibleChipsetsLabel = document.getElementById('compatibleChipsetsLabel');
            if (compatibleChipsetsLabel) compatibleChipsetsLabel.textContent = 'Socket:';

            if (cpuCompatibilityInfo) cpuCompatibilityInfo.style.display = 'flex';
            if (cpuChipsetsInfo) cpuChipsetsInfo.style.display = 'flex';
            if (ramTypeCompatInfo) ramTypeCompatInfo.style.display = 'none';

            // Set up checkbox event listener for compatibility filtering
            const showOnlyCompatibleCheckbox = document.getElementById('showOnlyCompatibleCheckbox');
            if (showOnlyCompatibleCheckbox) {
                // Remove any existing listeners
                showOnlyCompatibleCheckbox.replaceWith(showOnlyCompatibleCheckbox.cloneNode(true));
                const newCheckbox = document.getElementById('showOnlyCompatibleCheckbox');

                newCheckbox.addEventListener('change', () => {
                    this.populateComponentTable(componentType);
                });
            }
        } else if (componentType === 'ram' && this.currentBuild && this.currentBuild.motherboard) {
            // Hide PSU wattage container for RAM selection
            const psuWattageInfoContainer = document.getElementById('psuWattageInfoContainer');
            if (psuWattageInfoContainer) psuWattageInfoContainer.style.display = 'none';

            // Show RAM compatibility if motherboard is selected
            if (compatibilityInfoContainer) {
                compatibilityInfoContainer.style.display = 'block';
            }

            const selectedMotherboard = this.currentBuild.motherboard;
            const motherboardName = selectedMotherboard.name || selectedMotherboard.title || 'Unknown Motherboard';
            const motherboardMemoryTypes = selectedMotherboard.memoryType || [];
            const memorySlots = selectedMotherboard.ramSlots || selectedMotherboard.specifications?.ramSlots || 0;

            // Format memory types for display
            const memoryTypesArray = Array.isArray(motherboardMemoryTypes) ? motherboardMemoryTypes : [motherboardMemoryTypes];
            const memoryTypesDisplay = memoryTypesArray.length > 0 ? memoryTypesArray.join(', ') : 'Unknown';

            // Update compatibility info for RAM selection
            const selectedCpuLabel = document.getElementById('selectedCpuLabel');
            if (selectedCpuLabel) selectedCpuLabel.textContent = 'Selected Motherboard:';

            document.getElementById('selectedCpuNameInfo').textContent = motherboardName;
            document.getElementById('compatibleChipsetsInfo').textContent = memoryTypesDisplay;

            const compatibleChipsetsLabel = document.getElementById('compatibleChipsetsLabel');
            if (compatibleChipsetsLabel) compatibleChipsetsLabel.textContent = 'Supported Memory:';

            // Show memory slots info
            const ramSlotsInfo = document.getElementById('ramSlotsInfo');
            if (ramSlotsInfo && memorySlots > 0) {
                document.getElementById('motherboardRamSlots').textContent = `${memorySlots} slots`;
                ramSlotsInfo.style.display = 'flex';
            } else if (ramSlotsInfo) {
                ramSlotsInfo.style.display = 'none';
            }

            if (cpuCompatibilityInfo) cpuCompatibilityInfo.style.display = 'flex';
            if (cpuChipsetsInfo) cpuChipsetsInfo.style.display = 'flex';
            if (ramTypeCompatInfo) ramTypeCompatInfo.style.display = 'none';
            const cpuDdrInfoMb = document.getElementById('cpuDdrRequirementInfo');
            if (cpuDdrInfoMb) cpuDdrInfoMb.style.display = 'none';

            // Set up checkbox event listener for compatibility filtering
            const showOnlyCompatibleCheckbox = document.getElementById('showOnlyCompatibleCheckbox');
            if (showOnlyCompatibleCheckbox) {
                // Remove any existing listeners
                showOnlyCompatibleCheckbox.replaceWith(showOnlyCompatibleCheckbox.cloneNode(true));
                const newCheckbox = document.getElementById('showOnlyCompatibleCheckbox');

                newCheckbox.addEventListener('change', () => {
                    this.populateComponentTable(componentType);
                });
            }
        } else if (componentType === 'ram' && this.currentBuild && this.currentBuild.cpu && !this.currentBuild.motherboard) {
            // Hide PSU wattage container for RAM selection
            const psuWattageInfoContainer = document.getElementById('psuWattageInfoContainer');
            if (psuWattageInfoContainer) psuWattageInfoContainer.style.display = 'none';

            // Determine if the CPU's socket forces a single DDR generation
            const selectedCpu = this.currentBuild.cpu;
            const cpuSocket = (selectedCpu.socket || selectedCpu.socketType || '').toString().trim().toUpperCase();
            const cpuDdrRequirementInfo = document.getElementById('cpuDdrRequirementInfo');
            const cpuDdrRequirementText = document.getElementById('cpuDdrRequirementText');

            let requiredDdrType = null;
            if (cpuSocket && this.allMotherboards && this.allMotherboards.length > 0) {
                const compatibleMotherboards = this.allMotherboards.filter(mb =>
                    (mb.socket || '').toString().trim().toUpperCase() === cpuSocket
                );
                if (compatibleMotherboards.length > 0) {
                    const supportedDdrTypes = new Set();
                    compatibleMotherboards.forEach(mb => {
                        const memTypes = Array.isArray(mb.memoryType) ? mb.memoryType : (mb.memoryType ? [mb.memoryType] : []);
                        memTypes.forEach(t => {
                            const n = t.toString().trim().toUpperCase();
                            if (n.includes('DDR5')) supportedDdrTypes.add('DDR5');
                            if (n.includes('DDR4')) supportedDdrTypes.add('DDR4');
                        });
                    });
                    if (supportedDdrTypes.size === 1) {
                        requiredDdrType = [...supportedDdrTypes][0];
                    }
                }
            }

            if (requiredDdrType && cpuDdrRequirementInfo && cpuDdrRequirementText) {
                const cpuName = selectedCpu.name || selectedCpu.title || 'Selected CPU';
                cpuDdrRequirementText.textContent = `${cpuName} uses ${cpuSocket} socket — only ${requiredDdrType} memory is compatible`;
                cpuDdrRequirementInfo.style.display = 'flex';
                if (compatibilityInfoContainer) compatibilityInfoContainer.style.display = 'block';
            } else {
                if (cpuDdrRequirementInfo) cpuDdrRequirementInfo.style.display = 'none';
                if (compatibilityInfoContainer) compatibilityInfoContainer.style.display = 'none';
            }

            // Hide other info rows not relevant here
            if (cpuCompatibilityInfo) cpuCompatibilityInfo.style.display = 'none';
            if (cpuChipsetsInfo) cpuChipsetsInfo.style.display = 'none';
            if (ramTypeCompatInfo) ramTypeCompatInfo.style.display = 'none';
            const ramSlotsInfo = document.getElementById('ramSlotsInfo');
            if (ramSlotsInfo) ramSlotsInfo.style.display = 'none';
            const caseFormFactorInfo = document.getElementById('caseFormFactorInfo');
            if (caseFormFactorInfo) caseFormFactorInfo.style.display = 'none';
        } else if (componentType === 'cooler' && this.currentBuild && this.currentBuild.cpu) {
            // Hide PSU wattage container for cooler selection
            const psuWattageInfoContainer = document.getElementById('psuWattageInfoContainer');
            if (psuWattageInfoContainer) psuWattageInfoContainer.style.display = 'none';

            // Show cooler socket compatibility if CPU is selected
            if (compatibilityInfoContainer) {
                compatibilityInfoContainer.style.display = 'block';
            }

            const selectedCpu = this.currentBuild.cpu;
            const cpuName = selectedCpu.name || selectedCpu.title || 'Unknown CPU';
            const cpuSocket = selectedCpu.socket || selectedCpu.socketType || 'Unknown Socket';

            // Update compatibility info for cooler selection
            const selectedCpuLabel = document.getElementById('selectedCpuLabel');
            if (selectedCpuLabel) selectedCpuLabel.textContent = 'Selected CPU:';

            document.getElementById('selectedCpuNameInfo').textContent = cpuName;
            document.getElementById('compatibleChipsetsInfo').textContent = cpuSocket;

            const compatibleChipsetsLabel = document.getElementById('compatibleChipsetsLabel');
            if (compatibleChipsetsLabel) compatibleChipsetsLabel.textContent = 'Socket:';

            if (cpuCompatibilityInfo) cpuCompatibilityInfo.style.display = 'flex';
            if (cpuChipsetsInfo) cpuChipsetsInfo.style.display = 'flex';
            if (ramTypeCompatInfo) ramTypeCompatInfo.style.display = 'none';

            // Set up checkbox event listener for compatibility filtering
            const showOnlyCompatibleCheckbox = document.getElementById('showOnlyCompatibleCheckbox');
            if (showOnlyCompatibleCheckbox) {
                // Remove any existing listeners
                showOnlyCompatibleCheckbox.replaceWith(showOnlyCompatibleCheckbox.cloneNode(true));
                const newCheckbox = document.getElementById('showOnlyCompatibleCheckbox');

                newCheckbox.addEventListener('change', () => {
                    this.populateComponentTable(componentType);
                });
            }
        } else if (componentType === 'case' && this.currentBuild && this.currentBuild.motherboard) {
            // Hide PSU wattage container for case selection
            const psuWattageInfoContainer = document.getElementById('psuWattageInfoContainer');
            if (psuWattageInfoContainer) psuWattageInfoContainer.style.display = 'none';

            // Show case form factor compatibility if motherboard is selected
            if (compatibilityInfoContainer) {
                compatibilityInfoContainer.style.display = 'block';
            }

            const selectedMotherboard = this.currentBuild.motherboard;
            const motherboardName = selectedMotherboard.name || selectedMotherboard.title || 'Unknown Motherboard';
            const motherboardFormFactor = selectedMotherboard.formFactor || 'Unknown';

            // Update compatibility info for case selection
            const selectedCpuLabel = document.getElementById('selectedCpuLabel');
            if (selectedCpuLabel) selectedCpuLabel.textContent = 'Selected Motherboard:';

            document.getElementById('selectedCpuNameInfo').textContent = motherboardName;
            document.getElementById('compatibleChipsetsInfo').textContent = motherboardFormFactor;

            const compatibleChipsetsLabel = document.getElementById('compatibleChipsetsLabel');
            if (compatibleChipsetsLabel) compatibleChipsetsLabel.textContent = 'Form Factor:';

            if (cpuCompatibilityInfo) cpuCompatibilityInfo.style.display = 'flex';
            if (cpuChipsetsInfo) cpuChipsetsInfo.style.display = 'flex';
            if (ramTypeCompatInfo) ramTypeCompatInfo.style.display = 'none';

            // Set up checkbox event listener for compatibility filtering
            const showOnlyCompatibleCheckbox = document.getElementById('showOnlyCompatibleCheckbox');
            if (showOnlyCompatibleCheckbox) {
                // Remove any existing listeners
                showOnlyCompatibleCheckbox.replaceWith(showOnlyCompatibleCheckbox.cloneNode(true));
                const newCheckbox = document.getElementById('showOnlyCompatibleCheckbox');

                newCheckbox.addEventListener('change', () => {
                    this.populateComponentTable(componentType);
                });
            }
        } else if (componentType === 'psu') {
            // Show PSU wattage estimation
            const psuWattageInfoContainer = document.getElementById('psuWattageInfoContainer');
            if (psuWattageInfoContainer) {
                psuWattageInfoContainer.style.display = 'block';

                // Calculate and display wattage
                const wattageInfo = this.calculateEstimatedWattage();

                // Check if power is sufficient
                let isSufficient = true;
                if (this.currentBuild.psu && this.currentBuild.psu.wattage) {
                    const psuWattage = parseInt(this.currentBuild.psu.wattage) || 0;
                    isSufficient = wattageInfo.total <= psuWattage * 0.8;
                }

                // Update bolt icon color
                const boltIcon = psuWattageInfoContainer.querySelector('.fas.fa-bolt');
                if (boltIcon) {
                    boltIcon.style.color = isSufficient ? '#10b981' : '#f59e0b';
                }

                // Update info icon color
                const infoIcon = psuWattageInfoContainer.querySelector('.fas.fa-info-circle');
                if (infoIcon) {
                    infoIcon.style.color = isSufficient ? '#10b981' : '#f59e0b';
                }
            }

            // Calculate and display wattage
            const wattageInfo = this.calculateEstimatedWattage();
            const totalEstimatedWattageEl = document.getElementById('totalEstimatedWattage');
            const wattageBreakdownEl = document.getElementById('wattageBreakdown');

            if (totalEstimatedWattageEl) {
                // Check if PSU is selected to show "estimatedW / psuW" format
                if (this.currentBuild.psu && this.currentBuild.psu.wattage) {
                    const psuWattage = parseInt(this.currentBuild.psu.wattage) || 0;
                    totalEstimatedWattageEl.textContent = `${wattageInfo.total}W / ${psuWattage}W`;
                } else {
                    totalEstimatedWattageEl.textContent = `${wattageInfo.total}W`;
                }
            }

            if (wattageBreakdownEl) {
                if (wattageInfo.breakdown.length === 0) {
                    wattageBreakdownEl.textContent = 'No components selected';
                } else {
                    wattageBreakdownEl.innerHTML = wattageInfo.breakdown.join('<br>');
                }
            }

            // Hide compatibility container for PSU
            if (compatibilityInfoContainer) compatibilityInfoContainer.style.display = 'none';
        } else {
            if (compatibilityInfoContainer) compatibilityInfoContainer.style.display = 'none';
            if (cpuCompatibilityInfo) cpuCompatibilityInfo.style.display = 'none';
            if (cpuChipsetsInfo) cpuChipsetsInfo.style.display = 'none';
            if (ramTypeCompatInfo) ramTypeCompatInfo.style.display = 'none';

            // Hide PSU wattage container for non-PSU modals
            const psuWattageInfoContainer = document.getElementById('psuWattageInfoContainer');
            if (psuWattageInfoContainer) psuWattageInfoContainer.style.display = 'none';
        }

        // Dynamically set table headers based on component type
        this.setTableHeaders(componentType);

        // Populate table
        this.populateComponentTable(componentType);

        // Show modal
        const modal = document.getElementById('componentSelectorModal');
        if (!modal) {
            console.error('Component selector modal not found!');
            return;
        }
        modal.style.display = 'block';
        console.log('Modal displayed');

        // Set up badge click handlers (only once)
        this.setupBadgeClickHandlers();

        // Set up price range filters (only once)
        this.setupPriceRangeFilters();

        // Set up search filter (only once)
        this.setupSearchFilter();

        // Clear search input
        const searchInput = document.getElementById('componentSearchInput');
        if (searchInput) {
            searchInput.value = '';
        }

        // Add event listeners for sorting
        document.querySelectorAll('.sortable').forEach(header => {
            header.onclick = () => this.sortComponentTable(header.dataset.sort);
        });

        // Auto-show currently selected component in details panel
        let selectedComponent = null;
        if (this.currentBuild) {
            // Check if this component type is already selected
            if (componentType.startsWith('storage')) {
                // For storage slots (storage, storage2, storage3, etc.)
                selectedComponent = this.currentBuild[componentType];
            } else {
                // For regular components (gpu, cpu, motherboard, etc.)
                selectedComponent = this.currentBuild[componentType];
            }

            if (selectedComponent) {
                if (componentType === 'gpu') {
                    // For GPUs: expand the model row and open the details panel
                    setTimeout(() => {
                        // Expand the model row and mark the variant
                        this.expandAndSelectGPUsInModal([selectedComponent]);

                        // Open the details panel for the selected GPU immediately
                        if (!this.comparisonComponents) this.comparisonComponents = [];
                        this.comparisonComponents = [{ component: selectedComponent, componentType: 'gpu', variantIndex: 0 }];
                        this.currentComparisonIndex = 0;
                        this.currentDetailSelection = { component: selectedComponent, componentType: 'gpu', variantIndex: 0 };
                        this.closeStatisticsPanel();
                        this.renderComparisonView();
                        const panel = document.getElementById('componentDetailsPanel');
                        if (panel) panel.classList.remove('hidden');
                        this.createMobileDetailsToggle();
                        const modalContent = document.querySelector('.modal-content');
                        if (modalContent) modalContent.style.setProperty('border-radius', '12px 0 0 12px', 'important');

                        // Scroll to the selected variant after it's rendered
                        setTimeout(() => {
                            this.scrollToSelectedComponent(selectedComponent);
                        }, 900);
                    }, 150);
                } else {
                    // For other components: show details panel and scroll
                    setTimeout(() => {
                        this.showSingleComponentDetails(selectedComponent, componentType, 0);
                        setTimeout(() => {
                            this.scrollToSelectedComponent(selectedComponent);
                        }, 200);
                    }, 100);
                }
            }
        }
    }

    scrollToSelectedComponent(selectedComponent) {
        // Find the selected row in the modal table (not the builder display)
        const modalBody = document.querySelector('.modal-body');
        if (!modalBody) return;

        // Find the selected row — for GPUs check variant-selected, otherwise component-selected
        const selectedRow = modalBody.querySelector('.variant-selected') || modalBody.querySelector('.component-selected');

        if (selectedRow) {
            // Get the position of the row relative to the modal body
            const rowRect = selectedRow.getBoundingClientRect();
            const modalRect = modalBody.getBoundingClientRect();

            // Calculate how much to scroll to center the row
            const rowRelativeTop = rowRect.top - modalRect.top + modalBody.scrollTop;
            const rowHeight = selectedRow.offsetHeight;
            const modalHeight = modalBody.clientHeight;

            // Center the row in the modal
            const scrollPosition = rowRelativeTop - (modalHeight / 2) + (rowHeight / 2);

            modalBody.scrollTo({
                top: Math.max(0, scrollPosition),
                behavior: 'smooth'
            });
        }
    }

    refreshModalIfOpen(...types) {
        if (types.some(t => this.currentModalType === t)) {
            this.populateComponentTable(this.currentModalType);
        }
    }

    getComponentsForType(componentType) {
        switch (componentType) {
            case 'gpu': case 'gpu2': case 'gpu3': case 'gpu4': return this.allGPUs || [];
            case 'cpu': return this.allCPUs || [];
            case 'motherboard': return this.allMotherboards || [];
            case 'ram': return this.allRAM || [];
            case 'cooler': return this.allCoolers || [];
            case 'psu': return this.allPSUs || [];
            case 'case': return this.allCases || [];
            case 'storage': case 'storage2': case 'storage3':
            case 'storage4': case 'storage5': case 'storage6': return this.allStorage || [];
            case 'addon': case 'addon2': case 'addon3':
            case 'addon4': case 'addon5': case 'addon6': return this.allAddons || [];
            default: return [];
        }
    }

    populateComponentTable(componentType) {
        let components = [];

        switch (componentType) {
            case 'gpu':
                components = this.allGPUs || [];
                break;
            case 'cpu':
                components = this.allCPUs || [];
                break;
            case 'motherboard':
                components = this.allMotherboards || [];
                break;
            case 'ram':
                components = this.allRAM || [];
                break;
            case 'cooler':
                components = this.allCoolers || [];
                break;
            case 'psu':
                components = this.allPSUs || [];
                break;
            case 'case':
                components = this.allCases || [];
                break;
            case 'storage':
            case 'storage2':
            case 'storage3':
            case 'storage4':
            case 'storage5':
            case 'storage6':
                components = this.allStorage || [];
                break;
            case 'addon':
            case 'addon2':
            case 'addon3':
            case 'addon4':
            case 'addon5':
            case 'addon6':
                components = this.allAddons || [];
                break;
        }

        const tbody = document.getElementById('componentTableBody');
        if (!tbody) {
            console.error('Component table body not found!');
            return;
        }

        tbody.innerHTML = '';

        // Check if data is loaded
        if (!components || components.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" style="text-align: center; padding: 20px;">Loading components... Please wait.</td>';
            tbody.appendChild(row);
            console.log(`No components loaded yet for ${componentType}`);
            return;
        }

        console.log(`Found ${components.length} components for ${componentType}`);

        // Ensure components is a valid array before filtering
        if (!Array.isArray(components)) {
            console.error('Components is not an array:', components);
            components = [];
        }

        // Filter out invalid storage devices (missing price) and external/portable drives
        if (componentType === 'storage' || componentType === 'storage2' || componentType === 'storage3' ||
            componentType === 'storage4' || componentType === 'storage5' || componentType === 'storage6') {
            components = components.filter(component => {
                const hasPrice = (parseFloat(component.basePrice) || parseFloat(component.price) || parseFloat(component.salePrice) || parseFloat(component.currentPrice)) > 0;

                // Filter out external/portable drives
                const name = (component.name || component.title || '').toLowerCase();
                const isExternal = name.includes('portable') ||
                                  name.includes('external') ||
                                  name.includes('usb 3.') ||
                                  name.includes('usb-c') ||
                                  name.includes('travel');

                return hasPrice && !isExternal;
            });
        }

        // Filter out Threadripper CPUs from the frontend
        if (componentType === 'cpu') {
            components = components.filter(component => {
                const name = (component.name || component.title || '').toLowerCase();
                return !name.includes('threadripper');
            });
        }

        // Apply filters from the filter dropdowns
        const filterSelect = this.getFilterSelect(componentType);
        if (filterSelect && filterSelect.value) {
            const filtered = this.applyComponentFilter(components, componentType, filterSelect.value);
            if (filtered && Array.isArray(filtered)) {
                components = filtered;
                console.log(`After filter: ${components.length} components`);
            }
        }

        // Apply sort - when in modal context, use modal sorting
        // currentModalType is set when modal is open
        if (this.currentModalType) {
            // Use the modal's internal sorting (from clicking table headers)
            const sortedComponents = [...components];
            this.sortComponentsForModal(sortedComponents);
            components = sortedComponents;
        } else {
            // Use dropdown sorting for regular view
            const sortSelect = document.getElementById(`${componentType}SortSelect`);
            if (sortSelect && sortSelect.value) {
                const sorted = this.sortComponents([...components], componentType, sortSelect.value);
                if (sorted && Array.isArray(sorted)) {
                    components = sorted;
                }
            }
        }

        // Store original indices for component lookup
        const allComponentsArray = this.getComponentArray(componentType);

        if (!components || components.length === 0) {
            const row = document.createElement('tr');
            row.innerHTML = '<td colspan="7" style="text-align: center; padding: 20px;">No components match your filter criteria.</td>';
            tbody.appendChild(row);
            return;
        }

        // Apply badge filters
        if (this.activeBadgeFilters.size > 0) {
            components = components.filter(component => {
                let matchesAllFilters = true;

                this.activeBadgeFilters.forEach(filterKey => {
                    const [type, value] = filterKey.split(':');

                    if (type === 'manufacturer') {
                        if (component.manufacturer !== value) {
                            matchesAllFilters = false;
                        }
                    } else if (type === 'tier') {
                        const performanceScore = this.getGpuPerformance(component);
                        if (performanceScore !== null) {
                            let componentTier = '';
                            if (performanceScore < 0.475) {
                                componentTier = 'Low End';
                            }

                            if (componentTier !== value) {
                                matchesAllFilters = false;
                            }
                        }
                    } else if (type === 'value') {
                        // We'll check this after calculating great value
                    }
                });

                return matchesAllFilters;
            });
        }

        // Calculate value rankings for GPUs (performance per $1000)
        // This needs to include ALL individual GPU cards, not just the grouped ones
        let greatValueIds = new Set();
        if (componentType === 'gpu') {
            this.calculateGreatValueGPUs().then(ids => {
                this.greatValueGpuIds = ids;
            });
            greatValueIds = this.greatValueGpuIds || new Set();
        }

        // Apply "Great Value" filter if active
        let filteredComponents = components;
        if (this.activeBadgeFilters.has('value:Great Value')) {
            filteredComponents = components.filter(component => {
                return greatValueIds.has(component._id || component.title || component.name);
            });
        }

        // Apply price range filter
        if (this.minPrice !== null || this.maxPrice !== null) {
            filteredComponents = filteredComponents.filter(component => {
                // For grouped components (GPUs with variants), check if ANY variant meets the price requirement
                if (componentType === 'gpu' && component.collection) {
                    // Get cached variants for this component
                    const cacheKey = `${component.collection}_${component.name || component.title}`;
                    const variants = this.variantsCache.get(cacheKey);

                    if (variants && variants.length > 0) {
                        // Check if at least one variant meets the price filter
                        return variants.some(variant => {
                            const variantPrice = parseFloat(variant.salePrice || variant.currentPrice || variant.basePrice) || 0;

                            if (this.minPrice !== null && variantPrice < this.minPrice) {
                                return false;
                            }
                            if (this.maxPrice !== null && variantPrice > this.maxPrice) {
                                return false;
                            }

                            return true;
                        });
                    }
                }

                // For non-grouped components, check the component's own price
                const price = parseFloat(component.salePrice || component.currentPrice || component.basePrice || component.price) || 0;

                if (this.minPrice !== null && price < this.minPrice) {
                    return false;
                }
                if (this.maxPrice !== null && price > this.maxPrice) {
                    return false;
                }

                return true;
            });
        }

        // Apply compatibility filter for motherboards if checkbox is checked
        if (componentType === 'motherboard' && this.currentBuild && (this.currentBuild.cpu || this.currentBuild.ram || this.currentBuild.case)) {
            const showOnlyCompatibleCheckbox = document.getElementById('showOnlyCompatibleCheckbox');
            const selectedCpu = this.currentBuild.cpu;
            const selectedRam = this.currentBuild.ram;
            const selectedCase = this.currentBuild.case;
            const cpuChipsets = selectedCpu ? (selectedCpu.supportedChipsets || []) : [];
            const ramDdrType = selectedRam ? (selectedRam.memoryType || '') : '';

            if (showOnlyCompatibleCheckbox && showOnlyCompatibleCheckbox.checked) {
                filteredComponents = filteredComponents.filter(component => {
                    let isCompatible = true;

                    // Check CPU chipset compatibility
                    if (cpuChipsets.length > 0) {
                        const motherboardChipset = component.chipset;
                        if (!motherboardChipset || !cpuChipsets.includes(motherboardChipset)) {
                            isCompatible = false;
                        }
                    }

                    // Check RAM DDR type compatibility
                    if (ramDdrType && isCompatible) {
                        const motherboardMemoryTypes = component.memoryType || [];
                        const supportedTypes = Array.isArray(motherboardMemoryTypes) ? motherboardMemoryTypes : [motherboardMemoryTypes];

                        if (supportedTypes.length > 0) {
                            const isRamCompatible = supportedTypes.some(type =>
                                type && type.toUpperCase().includes(ramDdrType.toUpperCase())
                            );
                            if (!isRamCompatible) {
                                isCompatible = false;
                            }
                        }
                    }

                    // Check RAM slot count compatibility - motherboard must have enough slots for RAM kit
                    if (selectedRam && isCompatible) {
                        const ramKitSize = selectedRam.kitSize || 1;
                        const motherboardSlots = component.ramSlots || component.specifications?.ramSlots || 0;

                        // Only filter if we know the motherboard slot count
                        if (motherboardSlots > 0) {
                            // Motherboard must have at least as many slots as the RAM kit has modules
                            if (ramKitSize > motherboardSlots) {
                                isCompatible = false;
                            }
                        }
                    }

                    // Check case form factor compatibility
                    if (selectedCase && isCompatible) {
                        const caseFormFactors = selectedCase.formFactor || [];
                        const caseFormFactorArray = Array.isArray(caseFormFactors) ? caseFormFactors : [caseFormFactors];
                        const motherboardFormFactor = component.formFactor || '';

                        if (motherboardFormFactor && caseFormFactorArray.length > 0) {
                            let isCaseCompatible = false;

                            // Normalize motherboard form factor (handle all variants - remove hyphens and normalize spaces)
                            const moboFFUpper = motherboardFormFactor.toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();

                            // Check motherboard type (order matters: check more specific first)
                            const isMoboITX = moboFFUpper.includes('ITX') && !moboFFUpper.includes('ATX');
                            const isMoboMicroATX = moboFFUpper.includes('MATX') || moboFFUpper.includes('MICROATX');
                            const isMoboEATX = moboFFUpper.includes('EATX');
                            const isMoboATX = !isMoboITX && !isMoboMicroATX && !isMoboEATX && moboFFUpper.includes('ATX');

                            // Check if motherboard fits in the case
                            for (const caseFF of caseFormFactorArray) {
                                const caseFFUpper = caseFF.toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();

                                // Check case type (order matters: check more specific first)
                                const isCaseITX = caseFFUpper.includes('ITX') && !caseFFUpper.includes('ATX');
                                const isCaseMicroATX = caseFFUpper.includes('MATX') || caseFFUpper.includes('MICROATX');
                                const isCaseEATX = caseFFUpper.includes('EATX');
                                const isCaseATX = !isCaseITX && !isCaseMicroATX && !isCaseEATX && caseFFUpper.includes('ATX');

                                // E-ATX case accepts all motherboards
                                if (isCaseEATX) {
                                    isCaseCompatible = true;
                                    break;
                                }
                                // ATX case: compatible with ATX, mATX, ITX
                                else if (isCaseATX && (isMoboATX || isMoboMicroATX || isMoboITX)) {
                                    isCaseCompatible = true;
                                    break;
                                }
                                // mATX/Micro ATX case: compatible with mATX, ITX
                                else if (isCaseMicroATX && (isMoboMicroATX || isMoboITX)) {
                                    isCaseCompatible = true;
                                    break;
                                }
                                // ITX case: compatible with ITX only
                                else if (isCaseITX && isMoboITX) {
                                    isCaseCompatible = true;
                                    break;
                                }
                            }

                            if (!isCaseCompatible) {
                                isCompatible = false;
                            }
                        }
                    }

                    return isCompatible;
                });
            } else if (cpuChipsets.length > 0 || ramDdrType || selectedCase) {
                // If checkbox is not checked but CPU/RAM/Case is selected, sort compatible motherboards to the top
                filteredComponents.sort((a, b) => {
                    // Check CPU compatibility
                    const aChipset = a.chipset;
                    const bChipset = b.chipset;
                    const aCpuCompatible = (!cpuChipsets.length || (aChipset && cpuChipsets.includes(aChipset)));
                    const bCpuCompatible = (!cpuChipsets.length || (bChipset && cpuChipsets.includes(bChipset)));

                    // Check RAM DDR compatibility
                    let aRamCompatible = true;
                    let bRamCompatible = true;

                    if (ramDdrType) {
                        const aMemoryTypes = a.memoryType || [];
                        const aSupportedTypes = Array.isArray(aMemoryTypes) ? aMemoryTypes : [aMemoryTypes];
                        aRamCompatible = aSupportedTypes.length === 0 || aSupportedTypes.some(type =>
                            type && type.toUpperCase().includes(ramDdrType.toUpperCase())
                        );

                        const bMemoryTypes = b.memoryType || [];
                        const bSupportedTypes = Array.isArray(bMemoryTypes) ? bMemoryTypes : [bMemoryTypes];
                        bRamCompatible = bSupportedTypes.length === 0 || bSupportedTypes.some(type =>
                            type && type.toUpperCase().includes(ramDdrType.toUpperCase())
                        );
                    }

                    // Check RAM slot count compatibility
                    let aRamSlotsCompatible = true;
                    let bRamSlotsCompatible = true;

                    if (selectedRam) {
                        const ramKitSize = selectedRam.kitSize || 1;

                        const aSlotsCount = a.ramSlots || a.specifications?.ramSlots || 0;
                        if (aSlotsCount > 0) {
                            aRamSlotsCompatible = ramKitSize <= aSlotsCount;
                        }

                        const bSlotsCount = b.ramSlots || b.specifications?.ramSlots || 0;
                        if (bSlotsCount > 0) {
                            bRamSlotsCompatible = ramKitSize <= bSlotsCount;
                        }
                    }

                    // Check case form factor compatibility
                    let aCaseCompatible = true;
                    let bCaseCompatible = true;

                    if (selectedCase) {
                        const caseFormFactors = selectedCase.formFactor || [];
                        const caseFormFactorArray = Array.isArray(caseFormFactors) ? caseFormFactors : [caseFormFactors];

                        // Check motherboard A
                        const aFormFactor = a.formFactor || '';
                        const aFFUpper = aFormFactor.toUpperCase();
                        aCaseCompatible = false;

                        for (const caseFF of caseFormFactorArray) {
                            const caseFFUpper = caseFF.toUpperCase();
                            if (caseFFUpper.includes('E-ATX') || caseFFUpper.includes('EATX')) {
                                aCaseCompatible = true;
                                break;
                            } else if (caseFFUpper.includes('ATX') && !caseFFUpper.includes('MATX') && !caseFFUpper.includes('M-ATX')) {
                                if (aFFUpper.includes('ATX') || aFFUpper.includes('ITX')) {
                                    aCaseCompatible = true;
                                    break;
                                }
                            } else if (caseFFUpper.includes('MATX') || caseFFUpper.includes('M-ATX') || caseFFUpper.includes('MICRO ATX')) {
                                if (aFFUpper.includes('MATX') || aFFUpper.includes('M-ATX') || aFFUpper.includes('MICRO ATX') || aFFUpper.includes('ITX')) {
                                    aCaseCompatible = true;
                                    break;
                                }
                            } else if (caseFFUpper.includes('ITX')) {
                                if (aFFUpper.includes('ITX')) {
                                    aCaseCompatible = true;
                                    break;
                                }
                            }
                        }

                        // Check motherboard B
                        const bFormFactor = b.formFactor || '';
                        const bFFUpper = bFormFactor.toUpperCase();
                        bCaseCompatible = false;

                        for (const caseFF of caseFormFactorArray) {
                            const caseFFUpper = caseFF.toUpperCase();
                            if (caseFFUpper.includes('E-ATX') || caseFFUpper.includes('EATX')) {
                                bCaseCompatible = true;
                                break;
                            } else if (caseFFUpper.includes('ATX') && !caseFFUpper.includes('MATX') && !caseFFUpper.includes('M-ATX')) {
                                if (bFFUpper.includes('ATX') || bFFUpper.includes('ITX')) {
                                    bCaseCompatible = true;
                                    break;
                                }
                            } else if (caseFFUpper.includes('MATX') || caseFFUpper.includes('M-ATX') || caseFFUpper.includes('MICRO ATX')) {
                                if (bFFUpper.includes('MATX') || bFFUpper.includes('M-ATX') || bFFUpper.includes('MICRO ATX') || bFFUpper.includes('ITX')) {
                                    bCaseCompatible = true;
                                    break;
                                }
                            } else if (caseFFUpper.includes('ITX')) {
                                if (bFFUpper.includes('ITX')) {
                                    bCaseCompatible = true;
                                    break;
                                }
                            }
                        }
                    }

                    // Overall compatibility (CPU, RAM DDR type, RAM slots, and Case must all be compatible)
                    const aCompatible = aCpuCompatible && aRamCompatible && aRamSlotsCompatible && aCaseCompatible;
                    const bCompatible = bCpuCompatible && bRamCompatible && bRamSlotsCompatible && bCaseCompatible;

                    if (aCompatible && !bCompatible) return -1;
                    if (!aCompatible && bCompatible) return 1;
                    return 0;
                });
            }
        }

        // CPU socket compatibility filtering
        if (componentType === 'cpu' && this.currentBuild && this.currentBuild.motherboard) {
            const selectedMotherboard = this.currentBuild.motherboard;
            const motherboardSocket = selectedMotherboard.socket || selectedMotherboard.socketType;
            const showOnlyCompatibleCheckbox = document.getElementById('showOnlyCompatibleCheckbox');
            const isFilteringEnabled = showOnlyCompatibleCheckbox && showOnlyCompatibleCheckbox.checked;

            if (motherboardSocket) {
                if (isFilteringEnabled) {
                    // Filter to only show CPUs with matching socket
                    filteredComponents = filteredComponents.filter(cpu => {
                        const cpuSocket = cpu.socket || cpu.socketType;
                        if (!cpuSocket) return false;

                        // Normalize socket strings for comparison
                        const normalizedCpuSocket = cpuSocket.toString().trim().toUpperCase();
                        const normalizedMotherboardSocket = motherboardSocket.toString().trim().toUpperCase();

                        return normalizedCpuSocket === normalizedMotherboardSocket;
                    });
                } else {
                    // Sort compatible CPUs to the top
                    filteredComponents.sort((a, b) => {
                        const aSocket = a.socket || a.socketType;
                        const bSocket = b.socket || b.socketType;

                        const aCompatible = aSocket && aSocket.toString().trim().toUpperCase() === motherboardSocket.toString().trim().toUpperCase();
                        const bCompatible = bSocket && bSocket.toString().trim().toUpperCase() === motherboardSocket.toString().trim().toUpperCase();

                        if (aCompatible && !bCompatible) return -1;
                        if (!aCompatible && bCompatible) return 1;
                        return 0;
                    });
                }
            }
        }

        // RAM memory type compatibility filtering
        if (componentType === 'ram' && this.currentBuild && this.currentBuild.motherboard) {
            const selectedMotherboard = this.currentBuild.motherboard;
            const motherboardMemoryTypes = selectedMotherboard.memoryType || [];
            const showOnlyCompatibleCheckbox = document.getElementById('showOnlyCompatibleCheckbox');
            const isFilteringEnabled = showOnlyCompatibleCheckbox && showOnlyCompatibleCheckbox.checked;

            // Ensure motherboardMemoryTypes is an array
            const memoryTypesArray = Array.isArray(motherboardMemoryTypes) ? motherboardMemoryTypes : [motherboardMemoryTypes];

            if (memoryTypesArray.length > 0) {
                if (isFilteringEnabled) {
                    // Filter to only show RAM with matching memory type
                    filteredComponents = filteredComponents.filter(ram => {
                        const ramMemoryType = ram.memoryType;
                        if (!ramMemoryType) return false;

                        // Normalize memory type for comparison
                        const normalizedRamType = ramMemoryType.toString().trim().toUpperCase();

                        // Check if RAM type matches any of the motherboard's supported types
                        return memoryTypesArray.some(mbType => {
                            const normalizedMbType = mbType.toString().trim().toUpperCase();
                            return normalizedRamType.includes(normalizedMbType) || normalizedMbType.includes(normalizedRamType);
                        });
                    });
                } else {
                    // Sort compatible RAM to the top
                    filteredComponents.sort((a, b) => {
                        const aMemoryType = a.memoryType;
                        const bMemoryType = b.memoryType;

                        const aCompatible = aMemoryType && memoryTypesArray.some(mbType => {
                            const normalizedAType = aMemoryType.toString().trim().toUpperCase();
                            const normalizedMbType = mbType.toString().trim().toUpperCase();
                            return normalizedAType.includes(normalizedMbType) || normalizedMbType.includes(normalizedAType);
                        });

                        const bCompatible = bMemoryType && memoryTypesArray.some(mbType => {
                            const normalizedBType = bMemoryType.toString().trim().toUpperCase();
                            const normalizedMbType = mbType.toString().trim().toUpperCase();
                            return normalizedBType.includes(normalizedMbType) || normalizedMbType.includes(normalizedBType);
                        });

                        if (aCompatible && !bCompatible) return -1;
                        if (!aCompatible && bCompatible) return 1;
                        return 0;
                    });
                }
            }

            // RAM slot count filtering - filter out RAM kits with more modules than motherboard has slots
            const memorySlots = selectedMotherboard.ramSlots || selectedMotherboard.specifications?.ramSlots || 0;

            if (memorySlots > 0 && isFilteringEnabled) {
                // Filter to only show RAM kits that fit in the available slots
                filteredComponents = filteredComponents.filter(ram => {
                    const kitSize = ram.kitSize || 0;
                    return kitSize <= memorySlots;
                });
            }
        }

        // CPU-based RAM DDR type filtering (no motherboard selected yet)
        // If the selected CPU's socket is only compatible with DDR5 motherboards, hide DDR4 RAM (and vice versa)
        if (componentType === 'ram' && this.currentBuild && this.currentBuild.cpu && !this.currentBuild.motherboard) {
            const selectedCpu = this.currentBuild.cpu;
            const cpuSocket = (selectedCpu.socket || selectedCpu.socketType || '').toString().trim().toUpperCase();

            if (cpuSocket && this.allMotherboards && this.allMotherboards.length > 0) {
                // Find all motherboards compatible with this CPU socket
                const compatibleMotherboards = this.allMotherboards.filter(mb => {
                    const mbSocket = (mb.socket || '').toString().trim().toUpperCase();
                    return mbSocket === cpuSocket;
                });

                if (compatibleMotherboards.length > 0) {
                    // Collect all DDR types supported by compatible motherboards
                    const supportedDdrTypes = new Set();
                    compatibleMotherboards.forEach(mb => {
                        const memTypes = Array.isArray(mb.memoryType) ? mb.memoryType : (mb.memoryType ? [mb.memoryType] : []);
                        memTypes.forEach(t => {
                            const normalized = t.toString().trim().toUpperCase();
                            if (normalized.includes('DDR5')) supportedDdrTypes.add('DDR5');
                            if (normalized.includes('DDR4')) supportedDdrTypes.add('DDR4');
                        });
                    });

                    // Only filter if ALL compatible motherboards agree on a single DDR generation
                    if (supportedDdrTypes.size === 1) {
                        const onlyType = [...supportedDdrTypes][0]; // 'DDR5' or 'DDR4'
                        filteredComponents = filteredComponents.filter(ram => {
                            const ramType = (ram.memoryType || '').toString().trim().toUpperCase();
                            return ramType.includes(onlyType);
                        });
                    }
                }
            }
        }

        // Cooler socket compatibility filtering
        if (componentType === 'cooler' && this.currentBuild && this.currentBuild.cpu) {
            const selectedCpu = this.currentBuild.cpu;
            const cpuSocket = selectedCpu.socket || selectedCpu.socketType;
            const showOnlyCompatibleCheckbox = document.getElementById('showOnlyCompatibleCheckbox');
            const isFilteringEnabled = showOnlyCompatibleCheckbox && showOnlyCompatibleCheckbox.checked;

            // Helper function to normalize socket names (sTRX5 = TR5)
            const normalizeSocketName = (socket) => {
                const normalized = socket.toString().trim().toUpperCase();
                // Treat sTRX5 and TR5 as the same socket
                if (normalized === 'STRX5' || normalized === 'TR5') {
                    return 'TR5';
                }
                return normalized;
            };

            // Helper function to check socket compatibility
            const areSocketsCompatible = (socket1, socket2) => {
                return normalizeSocketName(socket1) === normalizeSocketName(socket2);
            };

            if (cpuSocket) {
                if (isFilteringEnabled) {
                    // Filter to only show coolers with compatible sockets
                    filteredComponents = filteredComponents.filter(cooler => {
                        const coolerSockets = cooler.compatibleSockets || [];
                        if (!Array.isArray(coolerSockets) || coolerSockets.length === 0) return false;

                        // Check if any cooler socket matches the CPU socket
                        return coolerSockets.some(socket => {
                            return areSocketsCompatible(socket, cpuSocket);
                        });
                    });
                } else {
                    // Sort compatible coolers to the top
                    filteredComponents.sort((a, b) => {
                        const aCoolerSockets = a.compatibleSockets || [];
                        const bCoolerSockets = b.compatibleSockets || [];

                        const aCompatible = Array.isArray(aCoolerSockets) && aCoolerSockets.some(socket => {
                            return areSocketsCompatible(socket, cpuSocket);
                        });

                        const bCompatible = Array.isArray(bCoolerSockets) && bCoolerSockets.some(socket => {
                            return areSocketsCompatible(socket, cpuSocket);
                        });

                        if (aCompatible && !bCompatible) return -1;
                        if (!aCompatible && bCompatible) return 1;
                        return 0;
                    });
                }
            }
        }

        // Case form factor compatibility filtering
        if (componentType === 'case' && this.currentBuild && this.currentBuild.motherboard) {
            const selectedMotherboard = this.currentBuild.motherboard;
            const motherboardFormFactor = selectedMotherboard.formFactor;
            const showOnlyCompatibleCheckbox = document.getElementById('showOnlyCompatibleCheckbox');
            const isFilteringEnabled = showOnlyCompatibleCheckbox && showOnlyCompatibleCheckbox.checked;

            // Helper function to check case/motherboard compatibility
            const isCaseCompatibleWithMotherboard = (caseComponent, moboFormFactor) => {
                const caseFormFactors = caseComponent.formFactor || [];
                const caseFormFactorArray = Array.isArray(caseFormFactors) ? caseFormFactors : [caseFormFactors];
                const moboFFUpper = moboFormFactor ? moboFormFactor.toUpperCase() : '';

                for (const caseFF of caseFormFactorArray) {
                    const caseFFUpper = caseFF.toUpperCase();

                    if (caseFFUpper.includes('E-ATX') || caseFFUpper.includes('EATX')) {
                        // E-ATX case is compatible with all motherboards
                        return true;
                    } else if (caseFFUpper.includes('ATX') && !caseFFUpper.includes('MATX') && !caseFFUpper.includes('M-ATX')) {
                        // ATX case: compatible with ATX, mATX, ITX
                        if (moboFFUpper.includes('ATX') || moboFFUpper.includes('ITX')) {
                            return true;
                        }
                    } else if (caseFFUpper.includes('MATX') || caseFFUpper.includes('M-ATX') || caseFFUpper.includes('MICRO ATX')) {
                        // mATX case: compatible with mATX, ITX
                        if (moboFFUpper.includes('MATX') || moboFFUpper.includes('M-ATX') || moboFFUpper.includes('MICRO ATX') || moboFFUpper.includes('ITX')) {
                            return true;
                        }
                    } else if (caseFFUpper.includes('ITX')) {
                        // ITX case: compatible with ITX only
                        if (moboFFUpper.includes('ITX')) {
                            return true;
                        }
                    }
                }

                return false;
            };

            if (motherboardFormFactor) {
                if (isFilteringEnabled) {
                    // Filter to only show compatible cases
                    filteredComponents = filteredComponents.filter(caseComponent => {
                        return isCaseCompatibleWithMotherboard(caseComponent, motherboardFormFactor);
                    });
                } else {
                    // Sort compatible cases to the top
                    filteredComponents.sort((a, b) => {
                        const aCompatible = isCaseCompatibleWithMotherboard(a, motherboardFormFactor);
                        const bCompatible = isCaseCompatibleWithMotherboard(b, motherboardFormFactor);

                        if (aCompatible && !bCompatible) return -1;
                        if (!aCompatible && bCompatible) return 1;
                        return 0;
                    });
                }
            }
        }

        // Apply search filter
        if (this.searchTerm) {
            filteredComponents = filteredComponents.filter(component => {
                const name = (component.title || component.name || '').toLowerCase();
                const manufacturer = (component.manufacturer || '').toLowerCase();
                return name.includes(this.searchTerm) || manufacturer.includes(this.searchTerm);
            });
        }

        // Check if no motherboards are compatible and display helpful message
        if (componentType === 'motherboard' && filteredComponents.length === 0 &&
            this.currentBuild && (this.currentBuild.cpu || this.currentBuild.ram)) {
            const selectedRam = this.currentBuild.ram;
            const ramDdrType = selectedRam ? (selectedRam.memoryType || '').toUpperCase() : '';

            let errorMessage = 'No motherboards compatible with Ram and cpu chipset, try changing to ';
            if (ramDdrType.includes('DDR5')) {
                errorMessage += 'DDR4 Ram';
            } else if (ramDdrType.includes('DDR4')) {
                errorMessage += 'DDR5 Ram';
            } else {
                errorMessage += 'DDR4 or DDR5 Ram';
            }

            const row = document.createElement('tr');
            row.innerHTML = `<td colspan="7" style="text-align: center; padding: 40px; color: #e74c3c; font-size: 16px;">
                <i class="fas fa-exclamation-triangle" style="margin-right: 10px;"></i>${errorMessage}
            </td>`;
            tbody.appendChild(row);
            return;
        }

        filteredComponents.forEach((component) => {
            const originalIndex = allComponentsArray.indexOf(component);
            const isGreatValue = greatValueIds.has(component._id || component.title || component.name);
            const row = this.createComponentTableRow(component, componentType, originalIndex, isGreatValue);
            tbody.appendChild(row);
        });

        // Update filter badges display
        this.updateFilterBadgesDisplay();
    }

    async calculateGreatValueGPUs() {
        // Fetch all individual GPU cards (ungrouped)
        try {
            const response = await fetch('/api/parts/gpus?groupByModel=false');
            if (!response.ok) {
                console.error('Failed to fetch individual GPUs for value calculation');
                return new Set();
            }

            const allIndividualGPUs = await response.json();

            // Group by tier and calculate value metric
            const highEndComponents = [];
            const midEndComponents = [];
            const lowEndComponents = [];

            allIndividualGPUs.forEach(gpu => {
                const performanceScore = this.getGpuPerformance(gpu);
                const price = parseFloat(gpu.salePrice) || parseFloat(gpu.currentPrice) || parseFloat(gpu.basePrice) || 0;

                if (performanceScore !== null && price > 0) {
                    const valueMetric = (performanceScore / price) * 1000;
                    const componentWithValue = { component: gpu, valueMetric, performanceScore };

                    // Categorize by tier
                    if (performanceScore > 0.8) {
                        highEndComponents.push(componentWithValue);
                    } else if (performanceScore < 0.475) {
                        lowEndComponents.push(componentWithValue);
                    } else {
                        midEndComponents.push(componentWithValue);
                    }
                }
            });

            // Get top 3 from each tier
            const getTop3 = (arr) => {
                return arr
                    .sort((a, b) => b.valueMetric - a.valueMetric)
                    .slice(0, 3)
                    .map(item => item.component._id || item.component.title || item.component.name);
            };

            const highEndTop3 = getTop3(highEndComponents);
            const midEndTop3 = getTop3(midEndComponents);
            const lowEndTop3 = getTop3(lowEndComponents);

            return new Set([...highEndTop3, ...midEndTop3, ...lowEndTop3]);
        } catch (error) {
            console.error('Error calculating great value GPUs:', error);
            return new Set();
        }
    }

    setupBadgeClickHandlers() {
        // Only set up once
        if (this.badgeClickHandlerSetup) return;

        const modalBody = document.querySelector('.modal-body');
        if (!modalBody) return;

        modalBody.addEventListener('click', (e) => {
            const badge = e.target.closest('.clickable-badge');
            if (badge) {
                e.stopPropagation(); // Prevent row click
                e.preventDefault();

                const filterType = badge.dataset.filterType;
                const filterValue = badge.dataset.filterValue;

                const filterKey = `${filterType}:${filterValue}`;

                if (this.activeBadgeFilters.has(filterKey)) {
                    this.activeBadgeFilters.delete(filterKey);
                } else {
                    this.activeBadgeFilters.add(filterKey);
                }

                this.populateComponentTable(this.currentModalType);
            }
        });

        this.badgeClickHandlerSetup = true;
    }

    setupPriceRangeFilters() {
        // Only set up once
        if (this.priceRangeFilterSetup) return;

        const minPriceInput = document.getElementById('minPriceInput');
        const maxPriceInput = document.getElementById('maxPriceInput');
        const clearPriceRangeBtn = document.getElementById('clearPriceRangeBtn');

        if (!minPriceInput || !maxPriceInput || !clearPriceRangeBtn) return;

        // Update filter on input change
        const updatePriceFilter = () => {
            this.minPrice = minPriceInput.value ? parseFloat(minPriceInput.value) : null;
            this.maxPrice = maxPriceInput.value ? parseFloat(maxPriceInput.value) : null;
            this.populateComponentTable(this.currentModalType);

            // Update scatter plot if statistics panel is visible
            const statisticsPanel = document.getElementById('statisticsPanel');
            if (statisticsPanel && !statisticsPanel.classList.contains('hidden')) {
                this.renderStatisticsScatterPlot();
            }
        };

        minPriceInput.addEventListener('input', updatePriceFilter);
        maxPriceInput.addEventListener('input', updatePriceFilter);

        clearPriceRangeBtn.addEventListener('click', () => {
            minPriceInput.value = '';
            maxPriceInput.value = '';
            this.minPrice = null;
            this.maxPrice = null;
            this.populateComponentTable(this.currentModalType);

            // Update scatter plot if statistics panel is visible
            const statisticsPanel = document.getElementById('statisticsPanel');
            if (statisticsPanel && !statisticsPanel.classList.contains('hidden')) {
                this.renderStatisticsScatterPlot();
            }
        });

        this.priceRangeFilterSetup = true;
    }

    setupSearchFilter() {
        // Only set up once
        if (this.searchFilterSetup) return;

        const searchInput = document.getElementById('componentSearchInput');
        if (!searchInput) return;

        // Update filter on input change
        searchInput.addEventListener('input', (e) => {
            this.searchTerm = e.target.value.toLowerCase().trim();
            this.populateComponentTable(this.currentModalType);
        });

        this.searchFilterSetup = true;
    }

    updateFilterBadgesDisplay() {
        const container = document.getElementById('badgeFiltersContainer');
        if (!container) return;

        if (this.activeBadgeFilters.size === 0) {
            container.innerHTML = '<span style="color: #999; font-size: 12px;">Click any badge to filter</span>';
            return;
        }

        let html = '';
        this.activeBadgeFilters.forEach(filterKey => {
            const [type, value] = filterKey.split(':');
            let color = '#2563eb';
            let bgColor = 'rgba(37, 99, 235, 0.1)';

            if (type === 'manufacturer') {
                const valueLower = value.toLowerCase();
                if (valueLower.includes('nvidia')) {
                    color = '#10b981';
                    bgColor = 'rgba(16, 185, 129, 0.1)';
                } else if (valueLower.includes('amd')) {
                    color = '#ef4444';
                    bgColor = 'rgba(239, 68, 68, 0.1)';
                } else if (valueLower.includes('intel')) {
                    color = '#3b82f6';
                    bgColor = 'rgba(59, 130, 246, 0.1)';
                }
            } else if (type === 'tier') {
                if (value === 'High End') {
                    color = '#3b82f6';
                    bgColor = 'rgba(59, 130, 246, 0.1)';
                } else if (value === 'Low End') {
                    color = '#64748b';
                    bgColor = 'rgba(100, 116, 139, 0.1)';
                }
            } else if (type === 'value') {
                color = '#16a34a';
                bgColor = 'rgba(34, 197, 94, 0.15)';
            }

            html += `<span class="active-filter-badge" data-filter-key="${filterKey}" style="display: inline-flex; align-items: center; gap: 6px; padding: 4px 10px; background: ${bgColor}; color: ${color}; border-radius: 4px; font-size: 12px; font-weight: 600; cursor: pointer;">
                ${value}
                <i class="fas fa-times" style="font-size: 10px;"></i>
            </span>`;
        });

        html += '<button class="clear-all-filters" style="padding: 4px 10px; background: #f8f9fa; color: #666; border: 1px solid #e9ecef; border-radius: 4px; font-size: 11px; font-weight: 600; cursor: pointer; margin-left: 4px;">Clear All</button>';

        container.innerHTML = html;

        // Add click handlers for removing filters
        container.querySelectorAll('.active-filter-badge').forEach(badge => {
            badge.addEventListener('click', () => {
                this.activeBadgeFilters.delete(badge.dataset.filterKey);
                this.populateComponentTable(this.currentModalType);
            });
        });

        container.querySelector('.clear-all-filters')?.addEventListener('click', () => {
            this.activeBadgeFilters.clear();
            this.populateComponentTable(this.currentModalType);
        });
    }

    createComponentTableRow(component, componentType, index, isGreatValue = false) {
        const row = document.createElement('tr');
        row.classList.add('component-main-row');

        // Add unique identifier for selection tracking
        const componentId = component._id || component.title || `${componentType}_${index}`;
        row.setAttribute('data-component-id', componentId);

        const name = component.title || component.name || '';
        const manufacturer = component.manufacturer || '';

        // Handle different price field structures (GPUs use basePrice/salePrice, CPUs use price/currentPrice)
        const basePrice = parseFloat(component.basePrice) || parseFloat(component.price) || 0;
        const salePrice = parseFloat(component.salePrice) || 0;
        const actualCurrentPrice = parseFloat(component.currentPrice) || 0;

        // Determine the display price
        let currentPrice;
        if (basePrice > 0 && salePrice > 0 && salePrice < basePrice) {
            // On sale - use sale price
            currentPrice = salePrice;
        } else if (actualCurrentPrice > 0) {
            // Use currentPrice if available
            currentPrice = actualCurrentPrice;
        } else if (basePrice > 0) {
            // Use base price
            currentPrice = basePrice;
        } else {
            currentPrice = 0;
        }

        const isOnSale = component.isOnSale || (salePrice > 0 && basePrice > 0 && salePrice < basePrice);
        const discount = isOnSale && basePrice > 0 ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0;

        // Component specs for display
        const specs = this.getComponentSpecs(component, componentType);

        // Get performance benchmark for GPUs and CPUs
        let performanceScore = null;
        let multiThreadPerformanceScore = null;
        if (componentType === 'gpu') {
            performanceScore = this.getGpuPerformance(component);
        } else if (componentType === 'cpu') {
            performanceScore = this.getCpuPerformance(component);
            multiThreadPerformanceScore = this.getCpuMultiThreadPerformance(component);
        }

        // Check if there are variants/individual cards
        // For GPUs, always show chevron since we want all GPUs to be expandable
        const hasVariants = componentType === 'gpu' || (component.variants && component.variants.length > 0);
        const expandIcon = hasVariants ? '<i class="fas fa-chevron-right expand-icon"></i>' : '';

        // Determine manufacturer badge color
        let badgeColor = '#2563eb'; // default blue
        let badgeBgColor = 'rgba(37, 99, 235, 0.1)';

        if (manufacturer) {
            const mfgLower = manufacturer.toLowerCase();
            if (mfgLower.includes('nvidia')) {
                badgeColor = '#10b981'; // green
                badgeBgColor = 'rgba(16, 185, 129, 0.1)';
            } else if (mfgLower.includes('amd')) {
                badgeColor = '#ef4444'; // red
                badgeBgColor = 'rgba(239, 68, 68, 0.1)';
            } else if (mfgLower.includes('intel')) {
                badgeColor = '#3b82f6'; // light blue
                badgeBgColor = 'rgba(59, 130, 246, 0.1)';
            }
        }

        // Determine performance tier badge (only show Low End)
        let perfTier = '';
        let perfTierColor = '';
        let perfTierBgColor = '';

        if (performanceScore !== null) {
            // Performance score is already normalized (0-1 range)
            if (performanceScore < 0.475) {
                perfTier = 'Low End';
                perfTierColor = '#64748b'; // slate gray
                perfTierBgColor = 'rgba(100, 116, 139, 0.1)';
            }
        }

        // Check if CPU includes a cooler
        let hasCoolerIncluded = false;
        if (componentType === 'cpu' && component.coolerIncluded === true) {
            hasCoolerIncluded = true;
        }

        // Check CPU socket compatibility with selected motherboard
        let isCpuCompatible = true;
        if (componentType === 'cpu' && this.currentBuild && this.currentBuild.motherboard) {
            const selectedMotherboard = this.currentBuild.motherboard;
            const motherboardSocket = selectedMotherboard.socket || selectedMotherboard.socketType;
            const cpuSocket = component.socket || component.socketType;

            if (motherboardSocket && cpuSocket) {
                const normalizedCpuSocket = cpuSocket.toString().trim().toUpperCase();
                const normalizedMotherboardSocket = motherboardSocket.toString().trim().toUpperCase();
                isCpuCompatible = normalizedCpuSocket === normalizedMotherboardSocket;
            }
        }

        // Check RAM memory type compatibility with selected motherboard
        let isRamCompatible = true;
        if (componentType === 'ram' && this.currentBuild && this.currentBuild.motherboard) {
            const selectedMotherboard = this.currentBuild.motherboard;
            const motherboardMemoryTypes = selectedMotherboard.memoryType || [];
            const ramMemoryType = component.memoryType;

            // Ensure motherboardMemoryTypes is an array
            const memoryTypesArray = Array.isArray(motherboardMemoryTypes) ? motherboardMemoryTypes : [motherboardMemoryTypes];

            if (memoryTypesArray.length > 0 && ramMemoryType) {
                const normalizedRamType = ramMemoryType.toString().trim().toUpperCase();

                // Check if RAM type matches any of the motherboard's supported types
                isRamCompatible = memoryTypesArray.some(mbType => {
                    const normalizedMbType = mbType.toString().trim().toUpperCase();
                    return normalizedRamType.includes(normalizedMbType) || normalizedMbType.includes(normalizedRamType);
                });
            }
        }

        // Check cooler socket compatibility with selected CPU
        let isCoolerCompatible = true;
        if (componentType === 'cooler' && this.currentBuild && this.currentBuild.cpu) {
            const selectedCpu = this.currentBuild.cpu;
            const cpuSocket = selectedCpu.socket || selectedCpu.socketType;
            const coolerSockets = component.compatibleSockets || [];

            // Helper function to normalize socket names (sTRX5 = TR5)
            const normalizeSocketName = (socket) => {
                const normalized = socket.toString().trim().toUpperCase();
                // Treat sTRX5 and TR5 as the same socket
                if (normalized === 'STRX5' || normalized === 'TR5') {
                    return 'TR5';
                }
                return normalized;
            };

            if (cpuSocket && Array.isArray(coolerSockets) && coolerSockets.length > 0) {
                const normalizedCpuSocket = normalizeSocketName(cpuSocket);

                // Check if any cooler socket matches the CPU socket
                isCoolerCompatible = coolerSockets.some(socket => {
                    const normalizedCoolerSocket = normalizeSocketName(socket);
                    return normalizedCoolerSocket === normalizedCpuSocket;
                });
            }
        }

        // Check motherboard/case form factor compatibility (when selecting motherboard)
        let isMotherboardCaseCompatible = true;
        if (componentType === 'motherboard' && this.currentBuild && this.currentBuild.case) {
            const selectedCase = this.currentBuild.case;
            const caseFormFactors = selectedCase.formFactor || [];
            const caseFormFactorArray = Array.isArray(caseFormFactors) ? caseFormFactors : [caseFormFactors];
            const motherboardFormFactor = component.formFactor || '';
            const moboFFUpper = motherboardFormFactor.toUpperCase();

            isMotherboardCaseCompatible = false; // Start with false, set true if compatible

            for (const caseFF of caseFormFactorArray) {
                const caseFFUpper = caseFF.toUpperCase();

                if (caseFFUpper.includes('E-ATX') || caseFFUpper.includes('EATX')) {
                    // E-ATX case accepts all motherboards
                    isMotherboardCaseCompatible = true;
                    break;
                } else if (caseFFUpper.includes('ATX') && !caseFFUpper.includes('MATX') && !caseFFUpper.includes('M-ATX')) {
                    // ATX case: accepts ATX, mATX, ITX
                    if (moboFFUpper.includes('ATX') || moboFFUpper.includes('ITX')) {
                        isMotherboardCaseCompatible = true;
                        break;
                    }
                } else if (caseFFUpper.includes('MATX') || caseFFUpper.includes('M-ATX') || caseFFUpper.includes('MICRO ATX') || caseFFUpper.includes('MICRO-ATX')) {
                    // mATX case: accepts mATX, ITX
                    if (moboFFUpper.includes('MATX') || moboFFUpper.includes('M-ATX') || moboFFUpper.includes('MICRO ATX') || moboFFUpper.includes('MICRO-ATX') || moboFFUpper.includes('ITX')) {
                        isMotherboardCaseCompatible = true;
                        break;
                    }
                } else if (caseFFUpper.includes('ITX')) {
                    // ITX case: accepts ITX only
                    if (moboFFUpper.includes('ITX')) {
                        isMotherboardCaseCompatible = true;
                        break;
                    }
                }
            }
        }

        // Check case/motherboard form factor compatibility (when selecting case)
        let isCaseCompatible = true;
        if (componentType === 'case' && this.currentBuild && this.currentBuild.motherboard) {
            const selectedMotherboard = this.currentBuild.motherboard;
            const motherboardFormFactor = selectedMotherboard.formFactor;
            const caseFormFactors = component.formFactor || [];
            const caseFormFactorArray = Array.isArray(caseFormFactors) ? caseFormFactors : [caseFormFactors];

            // Compatibility rules:
            // - E-ATX case: compatible with all (E-ATX, ATX, mATX, ITX)
            // - ATX case: compatible with ATX, mATX, ITX
            // - mATX case: compatible with mATX, ITX
            // - ITX case: compatible with ITX only

            isCaseCompatible = false; // Start with false, set true if compatible

            for (const caseFF of caseFormFactorArray) {
                const caseFFUpper = caseFF.toUpperCase();
                const moboFFUpper = motherboardFormFactor ? motherboardFormFactor.toUpperCase() : '';

                if (caseFFUpper.includes('E-ATX') || caseFFUpper.includes('EATX')) {
                    // E-ATX case is compatible with all motherboards
                    isCaseCompatible = true;
                    break;
                } else if (caseFFUpper.includes('ATX') && !caseFFUpper.includes('MATX') && !caseFFUpper.includes('M-ATX')) {
                    // ATX case: compatible with ATX, mATX, ITX
                    if (moboFFUpper.includes('ATX') || moboFFUpper.includes('ITX')) {
                        isCaseCompatible = true;
                        break;
                    }
                } else if (caseFFUpper.includes('MATX') || caseFFUpper.includes('M-ATX') || caseFFUpper.includes('MICRO ATX') || caseFFUpper.includes('MICRO-ATX')) {
                    // mATX case: compatible with mATX, ITX
                    if (moboFFUpper.includes('MATX') || moboFFUpper.includes('M-ATX') || moboFFUpper.includes('MICRO ATX') || moboFFUpper.includes('MICRO-ATX') || moboFFUpper.includes('ITX')) {
                        isCaseCompatible = true;
                        break;
                    }
                } else if (caseFFUpper.includes('ITX')) {
                    // ITX case: compatible with ITX only
                    if (moboFFUpper.includes('ITX')) {
                        isCaseCompatible = true;
                        break;
                    }
                }
            }
        }

        // Render different columns based on component type
        if (componentType === 'motherboard') {
            // Check CPU and RAM compatibility
            let isCompatible = true;
            let compatibilityBadge = '';

            // Check CPU compatibility
            if (this.currentBuild && this.currentBuild.cpu) {
                const selectedCpu = this.currentBuild.cpu;
                const cpuChipsets = selectedCpu.supportedChipsets || [];
                const motherboardChipset = component.chipset;

                if (cpuChipsets.length > 0 && motherboardChipset) {
                    isCompatible = cpuChipsets.includes(motherboardChipset);

                    if (!isCompatible) {
                        row.classList.add('incompatible');
                        compatibilityBadge = '<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: rgba(239, 68, 68, 0.15); color: #ef4444; border-radius: 4px; font-size: 10px; font-weight: 600;">⚠️ CPU Incompatible</span>';
                    } else {
                        // Check if BIOS update is required
                        const biosUpdateChipsets = selectedCpu.biosUpdateRequired || [];
                        if (biosUpdateChipsets.includes(motherboardChipset)) {
                            compatibilityBadge = '<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: rgba(255, 167, 38, 0.15); color: #ffa726; border-radius: 4px; font-size: 10px; font-weight: 600;">⚠️ BIOS Update</span>';
                        }
                    }
                }
            }

            // Check RAM DDR type compatibility
            if (this.currentBuild && this.currentBuild.ram) {
                const selectedRam = this.currentBuild.ram;
                const ramDdrType = selectedRam.memoryType || '';
                const motherboardMemoryTypes = component.memoryType || [];

                // Handle both array and string formats for motherboard memory types
                const supportedTypes = Array.isArray(motherboardMemoryTypes) ? motherboardMemoryTypes : [motherboardMemoryTypes];

                if (ramDdrType && supportedTypes.length > 0) {
                    const isRamCompatible = supportedTypes.some(type =>
                        type && type.toUpperCase().includes(ramDdrType.toUpperCase())
                    );

                    if (!isRamCompatible) {
                        isCompatible = false;
                        row.classList.add('incompatible');
                        // Append to existing badge or create new one
                        if (compatibilityBadge) {
                            compatibilityBadge += ' <span style="display: inline-block; margin-left: 4px; padding: 2px 8px; background: rgba(239, 68, 68, 0.15); color: #ef4444; border-radius: 4px; font-size: 10px; font-weight: 600;">⚠️ RAM ' + ramDdrType + ' Incompatible</span>';
                        } else {
                            compatibilityBadge = '<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: rgba(239, 68, 68, 0.15); color: #ef4444; border-radius: 4px; font-size: 10px; font-weight: 600;">⚠️ RAM ' + ramDdrType + ' Incompatible</span>';
                        }
                    }
                }
            }

            // Check case form factor compatibility
            if (this.currentBuild && this.currentBuild.case && !isMotherboardCaseCompatible) {
                const selectedCase = this.currentBuild.case;
                const caseFormFactors = selectedCase.formFactor || [];
                const caseFormFactorArray = Array.isArray(caseFormFactors) ? caseFormFactors : [caseFormFactors];
                const caseFormFactorStr = caseFormFactorArray.join('/');

                isCompatible = false;
                row.classList.add('incompatible');
                // Append to existing badge or create new one
                if (compatibilityBadge) {
                    compatibilityBadge += ' <span style="display: inline-block; margin-left: 4px; padding: 2px 8px; background: rgba(239, 68, 68, 0.15); color: #ef4444; border-radius: 4px; font-size: 10px; font-weight: 600;">⚠️ Too Large for ' + caseFormFactorStr + ' Case</span>';
                } else {
                    compatibilityBadge = '<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: rgba(239, 68, 68, 0.15); color: #ef4444; border-radius: 4px; font-size: 10px; font-weight: 600;">⚠️ Too Large for ' + caseFormFactorStr + ' Case</span>';
                }
            }

            // Truncate motherboard name to 60 characters
            const truncatedName = name.length > 60 ? name.substring(0, 60) + '...' : name;
            const imageUrl = component.imageUrl || component.image || '';

            // Get slot counts
            const ramSlots = component.ramSlots || '-';
            const m2Slots = component.m2Slots || '-';
            const pcieSlots = component.pcieSlots || '-';

            // Format memory type display
            const memoryTypeDisplay = component.memoryType && Array.isArray(component.memoryType) && component.memoryType.length > 0
                ? component.memoryType.join(', ')
                : (component.memoryType || '-');

            row.innerHTML = `
                <td style="padding: 8px; text-align: center; width: 100px;">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${name}" style="width: 80px; height: 80px; object-fit: contain; border-radius: 4px;">` : '<div style="width: 80px; height: 80px; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; margin: 0 auto;"><i class="fas fa-memory" style="color: #ccc; font-size: 24px;"></i></div>'}
                </td>
                <td>
                    <div class="component-name-wrapper">
                        ${expandIcon}
                        <span class="component-name" title="${name}">${truncatedName}</span>
                        ${this.debugMode ? `<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: rgba(251, 191, 36, 0.15); color: #fbbf24; border-radius: 4px; font-size: 10px; font-weight: 600;">[${component.saveCount || 0} saves]</span>` : ''}
                        ${manufacturer ? `<span class="manufacturer-badge clickable-badge" data-filter-type="manufacturer" data-filter-value="${manufacturer}" style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: ${badgeBgColor}; color: ${badgeColor}; border-radius: 4px; font-size: 10px; font-weight: 600; vertical-align: middle; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">${manufacturer}</span>` : ''}
                        ${compatibilityBadge}
                    </div>
                    ${specs ? '<div class="component-specs">' + specs + '</div>' : ''}
                </td>
                <td>${component.formFactor || '-'}</td>
                <td>${component.socket || '-'}</td>
                <td>${component.chipset || '-'}</td>
                <td>${memoryTypeDisplay}</td>
                <td>${ramSlots}</td>
                <td>${m2Slots}</td>
                <td>${pcieSlots}</td>
                <td style="text-align: center;">${component.networking?.wifi ? '<span style="color: #10b981; font-size: 16px;" title="WiFi included">✓</span>' : '<span style="color: #6b7280; font-size: 14px;">—</span>'}</td>
                <td class="price-cell">
                    ${isOnSale ? `
                        <div class="sale-price">$${salePrice.toFixed(2)}</div>
                        <div class="original-price strikethrough">$${basePrice.toFixed(2)}</div>
                        <span class="discount-badge" style="background: ${this.getDiscountColor(discount)}">${discount}% OFF</span>
                    ` : `
                        <div class="current-price">$${basePrice.toFixed(2)}</div>
                    `}
                </td>
            `;
        } else if (componentType === 'ram') {
            // RAM rendering with Image, DDR, Size, and Speed columns
            const memoryType = component.memoryType || '-';
            const imageUrl = component.imageUrl || component.image || '';

            // Format capacity as "2x16GB" if kitConfiguration exists, otherwise use capacity field
            let capacityDisplay = '-';
            if (component.kitConfiguration) {
                capacityDisplay = component.kitConfiguration;
            } else if (component.kitSize && component.capacity) {
                // Build kit configuration from kitSize and capacity (e.g., 2 sticks of 16GB = "2x16GB")
                capacityDisplay = `${component.kitSize}x${component.capacity}GB`;
            } else if (component.capacity) {
                // Fallback to just capacity if available
                capacityDisplay = typeof component.capacity === 'string' ? component.capacity : `${component.capacity}GB`;
            }

            const speed = component.speed ? (typeof component.speed === 'string' ? component.speed : `${component.speed} MHz`) : '-';

            row.innerHTML = `
                <td style="padding: 8px; text-align: center; width: 100px;">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${name}" style="width: 80px; height: 80px; object-fit: contain; border-radius: 4px;">` : '<div style="width: 80px; height: 80px; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; margin: 0 auto;"><i class="fas fa-hdd" style="color: #ccc; font-size: 24px;"></i></div>'}
                </td>
                <td>
                    <div class="component-name-wrapper">
                        ${expandIcon}
                        <span class="component-name">${name}</span>
                        ${this.debugMode ? `<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: rgba(251, 191, 36, 0.15); color: #fbbf24; border-radius: 4px; font-size: 10px; font-weight: 600;">[${component.saveCount || 0} saves]</span>` : ''}
                        ${manufacturer ? `<span class="manufacturer-badge clickable-badge" data-filter-type="manufacturer" data-filter-value="${manufacturer}" style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: ${badgeBgColor}; color: ${badgeColor}; border-radius: 4px; font-size: 10px; font-weight: 600; vertical-align: middle; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">${manufacturer}</span>` : ''}
                    </div>
                </td>
                <td>${memoryType}</td>
                <td>${capacityDisplay}</td>
                <td>${speed}</td>
                <td class="price-cell">
                    ${isOnSale ? `
                        <div class="sale-price">$${salePrice.toFixed(2)}</div>
                        <div class="original-price strikethrough">$${basePrice.toFixed(2)}</div>
                        <span class="discount-badge" style="background: ${this.getDiscountColor(discount)}">${discount}% OFF</span>
                    ` : `
                        <div class="current-price">$${basePrice.toFixed(2)}</div>
                    `}
                </td>
            `;
        } else if (componentType === 'psu') {
            // PSU rendering with Image, Wattage, Certification, and Modularity columns
            const wattage = component.wattage ? `${component.wattage}W` : '-';
            const certification = component.certification || '-';
            const modularity = component.modularity || '-';
            const imageUrl = component.imageUrl || component.image || '';

            row.innerHTML = `
                <td style="padding: 8px; text-align: center; width: 100px;">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${name}" style="width: 80px; height: 80px; object-fit: contain; border-radius: 4px;">` : '<div style="width: 80px; height: 80px; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; margin: 0 auto;"><i class="fas fa-plug" style="color: #ccc; font-size: 24px;"></i></div>'}
                </td>
                <td>
                    <div class="component-name-wrapper">
                        ${expandIcon}
                        <span class="component-name">${name}</span>
                        ${this.debugMode ? `<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: rgba(251, 191, 36, 0.15); color: #fbbf24; border-radius: 4px; font-size: 10px; font-weight: 600;">[${component.saveCount || 0} saves]</span>` : ''}
                        ${manufacturer ? `<span class="manufacturer-badge clickable-badge" data-filter-type="manufacturer" data-filter-value="${manufacturer}" style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: ${badgeBgColor}; color: ${badgeColor}; border-radius: 4px; font-size: 10px; font-weight: 600; vertical-align: middle; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">${manufacturer}</span>` : ''}
                    </div>
                    ${specs ? '<div class="component-specs">' + specs + '</div>' : ''}
                </td>
                <td>${wattage}</td>
                <td>${certification}</td>
                <td>${modularity}</td>
                <td class="price-cell">
                    ${isOnSale ? `
                        <div class="sale-price">$${salePrice.toFixed(2)}</div>
                        <div class="original-price strikethrough">$${basePrice.toFixed(2)}</div>
                        <span class="discount-badge" style="background: ${this.getDiscountColor(discount)}">${discount}% OFF</span>
                    ` : `
                        <div class="current-price">$${basePrice.toFixed(2)}</div>
                    `}
                </td>
            `;
        } else if (componentType === 'cooler') {
            // Cooler rendering with Image and simplified Type column
            let coolerType = component.coolerType || '-';
            const imageUrl = component.imageUrl || component.image || '';

            // Simplify cooler type to just "Liquid" or "Air"
            if (coolerType !== '-') {
                if (coolerType.toLowerCase().includes('liquid') || coolerType.toLowerCase().includes('aio')) {
                    coolerType = 'Liquid';
                } else if (coolerType.toLowerCase().includes('air')) {
                    coolerType = 'Air';
                }
            }

            // Get socket compatibility for debug mode
            const socketCompatibility = component.socketCompatibility || [];
            const socketsDisplay = socketCompatibility.length > 0
                ? socketCompatibility.join(', ')
                : 'No sockets defined';
            const socketDebugInfo = this.debugMode
                ? `<div style="font-size: 11px; color: #666; margin-top: 4px;">🔌 Sockets: ${socketsDisplay}</div>`
                : '';

            row.innerHTML = `
                <td style="padding: 8px; text-align: center; width: 100px;">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${name}" style="width: 80px; height: 80px; object-fit: contain; border-radius: 4px;">` : '<div style="width: 80px; height: 80px; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; margin: 0 auto;"><i class="fas fa-snowflake" style="color: #ccc; font-size: 24px;"></i></div>'}
                </td>
                <td>
                    <div class="component-name-wrapper">
                        ${expandIcon}
                        <span class="component-name">${name}</span>
                        ${this.debugMode ? `<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: rgba(251, 191, 36, 0.15); color: #fbbf24; border-radius: 4px; font-size: 10px; font-weight: 600;">[${component.saveCount || 0} saves]</span>` : ''}
                        ${manufacturer ? `<span class="manufacturer-badge clickable-badge" data-filter-type="manufacturer" data-filter-value="${manufacturer}" style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: ${badgeBgColor}; color: ${badgeColor}; border-radius: 4px; font-size: 10px; font-weight: 600; vertical-align: middle; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">${manufacturer}</span>` : ''}
                    </div>
                    ${specs ? '<div class="component-specs">' + specs + '</div>' : ''}
                    ${socketDebugInfo}
                </td>
                <td>${coolerType}</td>
                <td class="price-cell">
                    ${isOnSale ? `
                        <div class="sale-price">$${salePrice.toFixed(2)}</div>
                        <div class="original-price strikethrough">$${basePrice.toFixed(2)}</div>
                        <span class="discount-badge" style="background: ${this.getDiscountColor(discount)}">${discount}% OFF</span>
                    ` : `
                        <div class="current-price">$${basePrice.toFixed(2)}</div>
                    `}
                </td>
            `;
        } else if (componentType === 'case') {
            // Case rendering with Image, Form Factor and RGB columns
            const formFactor = component.formFactor && Array.isArray(component.formFactor) && component.formFactor.length > 0
                ? component.formFactor.join(', ')
                : (component.formFactor || '-');

            const hasRGB = component.specifications?.hasRGB ? 'Yes' : 'No';
            const imageUrl = component.imageUrl || component.image || '';

            // Generate compatibility badge if incompatible
            let compatibilityBadge = '';
            if (this.currentBuild && this.currentBuild.motherboard && !isCaseCompatible) {
                const motherboardFormFactor = this.currentBuild.motherboard.formFactor;
                compatibilityBadge = `<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: rgba(239, 68, 68, 0.15); color: #ef4444; border-radius: 4px; font-size: 10px; font-weight: 600;">⚠️ ${motherboardFormFactor} Motherboard Too Large</span>`;
            }

            // GPU size warning for ITX and mATX cases
            if (this.currentBuild && this.currentBuild.gpu) {
                const gpuLength = this.currentBuild.gpu.length || 0;
                if (gpuLength > 0) {
                    const caseFormFactors = component.formFactor || [];
                    const caseFormFactorArray = Array.isArray(caseFormFactors) ? caseFormFactors : [caseFormFactors];

                    const isITXCase = caseFormFactorArray.some(ff => {
                        const u = ff.toUpperCase().replace(/-/g, '').replace(/\s+/g, '');
                        return u.includes('ITX') && !u.includes('ATX');
                    });
                    const isMATXCase = caseFormFactorArray.some(ff => {
                        const u = ff.toUpperCase().replace(/-/g, '').replace(/\s+/g, '');
                        return u.includes('MATX') || u.includes('MICROATX');
                    });

                    const gpuName = this.currentBuild.gpu.gpuModel || this.currentBuild.gpu.name || 'GPU';

                    if (isITXCase && gpuLength > 300) {
                        compatibilityBadge += `<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: rgba(245, 158, 11, 0.15); color: #f59e0b; border-radius: 4px; font-size: 10px; font-weight: 600;">⚠️ GPU May Not Fit (≈${gpuLength}mm)</span>`;
                    } else if (isMATXCase && gpuLength > 340) {
                        compatibilityBadge += `<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: rgba(245, 158, 11, 0.15); color: #f59e0b; border-radius: 4px; font-size: 10px; font-weight: 600;">⚠️ GPU May Not Fit (≈${gpuLength}mm)</span>`;
                    }
                }
            }

            row.innerHTML = `
                <td style="padding: 8px; text-align: center; width: 100px;">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${name}" style="width: 80px; height: 80px; object-fit: contain; border-radius: 4px;">` : '<div style="width: 80px; height: 80px; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; margin: 0 auto;"><i class="fas fa-box" style="color: #ccc; font-size: 24px;"></i></div>'}
                </td>
                <td>
                    <div class="component-name-wrapper">
                        ${expandIcon}
                        <span class="component-name">${name}</span>
                        ${this.debugMode ? `<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: rgba(251, 191, 36, 0.15); color: #fbbf24; border-radius: 4px; font-size: 10px; font-weight: 600;">[${component.saveCount || 0} saves]</span>` : ''}
                        ${manufacturer ? `<span class="manufacturer-badge clickable-badge" data-filter-type="manufacturer" data-filter-value="${manufacturer}" style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: ${badgeBgColor}; color: ${badgeColor}; border-radius: 4px; font-size: 10px; font-weight: 600; vertical-align: middle; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">${manufacturer}</span>` : ''}
                        ${compatibilityBadge}
                    </div>
                    ${specs ? '<div class="component-specs">' + specs + '</div>' : ''}
                </td>
                <td>${formFactor}</td>
                <td>${hasRGB}</td>
                <td class="price-cell">
                    ${isOnSale ? `
                        <div class="sale-price">$${salePrice.toFixed(2)}</div>
                        <div class="original-price strikethrough">$${basePrice.toFixed(2)}</div>
                        <span class="discount-badge" style="background: ${this.getDiscountColor(discount)}">${discount}% OFF</span>
                    ` : `
                        <div class="current-price">$${basePrice.toFixed(2)}</div>
                    `}
                </td>
            `;
        } else if (componentType === 'storage' || componentType === 'storage2' || componentType === 'storage3' ||
                   componentType === 'storage4' || componentType === 'storage5' || componentType === 'storage6') {
            // Storage rendering with Image, Type and Capacity columns
            const storageType = component.type || '-';
            const imageUrl = component.imageUrl || component.image || '';

            // Format capacity: convert to TB if >= 1000 GB
            let capacity = '-';
            if (component.capacity) {
                if (component.capacity >= 1000) {
                    capacity = `${component.capacity / 1000}TB`;
                } else {
                    capacity = `${component.capacity}GB`;
                }
            }

            row.innerHTML = `
                <td style="padding: 8px; text-align: center; width: 100px;">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${name}" style="width: 80px; height: 80px; object-fit: contain; border-radius: 4px;">` : '<div style="width: 80px; height: 80px; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; margin: 0 auto;"><i class="fas fa-database" style="color: #ccc; font-size: 24px;"></i></div>'}
                </td>
                <td>
                    <div class="component-name-wrapper">
                        ${expandIcon}
                        <span class="component-name">${name}</span>
                        ${this.debugMode ? `<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: rgba(251, 191, 36, 0.15); color: #fbbf24; border-radius: 4px; font-size: 10px; font-weight: 600;">[${component.saveCount || 0} saves]</span>` : ''}
                        ${manufacturer ? `<span class="manufacturer-badge clickable-badge" data-filter-type="manufacturer" data-filter-value="${manufacturer}" style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: ${badgeBgColor}; color: ${badgeColor}; border-radius: 4px; font-size: 10px; font-weight: 600; vertical-align: middle; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">${manufacturer}</span>` : ''}
                    </div>
                    ${specs ? '<div class="component-specs">' + specs + '</div>' : ''}
                </td>
                <td>${storageType}</td>
                <td>${capacity}</td>
                <td class="price-cell">
                    ${isOnSale ? `
                        <div class="sale-price">$${salePrice.toFixed(2)}</div>
                        <div class="original-price strikethrough">$${basePrice.toFixed(2)}</div>
                        <span class="discount-badge" style="background: ${this.getDiscountColor(discount)}">${discount}% OFF</span>
                    ` : `
                        <div class="current-price">$${basePrice.toFixed(2)}</div>
                    `}
                </td>
            `;
        } else if (componentType === 'addon' || componentType === 'addon2' || componentType === 'addon3' ||
                   componentType === 'addon4' || componentType === 'addon5' || componentType === 'addon6') {
            // Addon rendering with Image column
            const imageUrl = component.imageUrl || component.image || '';
            const category = component.category || '';
            const type = component.type || '';

            // Create specs line with category and type
            let addonSpecs = [];
            if (category) addonSpecs.push(category);
            if (type) addonSpecs.push(type);
            const addonSpecsText = addonSpecs.join(' • ');

            row.innerHTML = `
                <td style="padding: 8px; text-align: center;">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${name}" style="width: 80px; height: 80px; object-fit: contain; border-radius: 4px;">` : '<div style="width: 80px; height: 80px; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center;"><i class="fas fa-image" style="color: #ccc; font-size: 24px;"></i></div>'}
                </td>
                <td>
                    <div class="component-name-wrapper">
                        ${expandIcon}
                        <span class="component-name">${name}</span>
                        ${this.debugMode ? `<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: rgba(251, 191, 36, 0.15); color: #fbbf24; border-radius: 4px; font-size: 10px; font-weight: 600;">[${component.saveCount || 0} saves]</span>` : ''}
                        ${manufacturer ? `<span class="manufacturer-badge clickable-badge" data-filter-type="manufacturer" data-filter-value="${manufacturer}" style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: ${badgeBgColor}; color: ${badgeColor}; border-radius: 4px; font-size: 10px; font-weight: 600; vertical-align: middle; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">${manufacturer}</span>` : ''}
                    </div>
                    ${addonSpecsText ? '<div class="component-specs">' + addonSpecsText + '</div>' : ''}
                </td>
                <td class="price-cell">
                    ${isOnSale ? `
                        <div class="sale-price">$${salePrice.toFixed(2)}</div>
                        <div class="original-price strikethrough">$${basePrice.toFixed(2)}</div>
                        <span class="discount-badge" style="background: ${this.getDiscountColor(discount)}">${discount}% OFF</span>
                    ` : `
                        <div class="current-price">$${basePrice.toFixed(2)}</div>
                    `}
                </td>
            `;
        } else {
            // GPU and CPU rendering (existing code)
            // Get VRAM info for GPUs
            let vramDisplay = '-';
            if (componentType === 'gpu') {
                const memorySize = component.memorySize || component.memory?.size;
                const memoryType = component.memoryType || component.memory?.type;
                if (memorySize && memoryType) {
                    vramDisplay = `${memorySize}GB ${memoryType}`;
                } else if (memorySize) {
                    vramDisplay = `${memorySize}GB`;
                }
            }

            const imageUrl = component.imageUrl || component.image || '';
            const fallbackIcon = componentType === 'cpu' ? 'microchip' : 'image';

            row.innerHTML = `
                ${componentType === 'cpu' ? `<td style="padding: 8px; text-align: center; width: 100px;">
                    ${imageUrl ? `<img src="${imageUrl}" alt="${name}" style="width: 80px; height: 80px; object-fit: contain; border-radius: 4px;">` : '<div style="width: 80px; height: 80px; background: #f0f0f0; border-radius: 4px; display: flex; align-items: center; justify-content: center; margin: 0 auto;"><i class="fas fa-microchip" style="color: #ccc; font-size: 24px;"></i></div>'}
                </td>` : ''}
                <td>
                    <div class="component-name-wrapper">
                        ${expandIcon}
                        <span class="component-name">${name}</span>
                        ${this.debugMode ? `<span style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: rgba(251, 191, 36, 0.15); color: #fbbf24; border-radius: 4px; font-size: 10px; font-weight: 600;">[${component.saveCount || 0} saves]</span>` : ''}
                        ${manufacturer ? `<span class="manufacturer-badge clickable-badge" data-filter-type="manufacturer" data-filter-value="${manufacturer}" style="display: inline-block; margin-left: 8px; padding: 2px 8px; background: ${badgeBgColor}; color: ${badgeColor}; border-radius: 4px; font-size: 10px; font-weight: 600; vertical-align: middle; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">${manufacturer}</span>` : ''}
                        ${perfTier ? `<span class="performance-tier-badge clickable-badge" data-filter-type="tier" data-filter-value="${perfTier}" style="display: inline-block; margin-left: 6px; padding: 2px 8px; background: ${perfTierBgColor}; color: ${perfTierColor}; border-radius: 4px; font-size: 10px; font-weight: 600; vertical-align: middle; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">${perfTier}</span>` : ''}
                        ${isGreatValue ? `<span class="great-value-badge clickable-badge" data-filter-type="value" data-filter-value="Great Value" style="display: inline-block; margin-left: 6px; padding: 2px 8px; background: rgba(34, 197, 94, 0.15); color: #16a34a; border-radius: 4px; font-size: 10px; font-weight: 600; vertical-align: middle; cursor: pointer; transition: transform 0.2s, box-shadow 0.2s;">Great Value</span>` : ''}
                        ${hasCoolerIncluded ? `<span class="cooler-included-badge" style="display: inline-block; margin-left: 6px; padding: 2px 8px; background: rgba(59, 130, 246, 0.15); color: #3b82f6; border-radius: 4px; font-size: 10px; font-weight: 600; vertical-align: middle;"><i class="fas fa-snowflake" style="margin-right: 4px;"></i>Cooler Included</span>` : ''}
                    </div>
                    ${specs ? '<div class="component-specs">' + specs + '</div>' : ''}
                </td>
                ${componentType === 'gpu' ? `<td>${vramDisplay}</td>` : ''}
                ${componentType === 'gpu' ? `<td style="text-align: center;">${component.releaseYear || '-'}</td>` : ''}
                <td class="cpu-only-column" style="display: ${componentType === 'cpu' ? '' : 'none'}; text-align: center;">
                    ${component.releaseYear || '-'}
                </td>
                <td class="performance-cell">
                    ${performanceScore !== null ? '<span class="performance-score" title="Performance based on data from https://www.tomshardware.com/" style="background: ' + this.getPerformanceColor(performanceScore * 100) + '; color: white; font-weight: 600; padding: 4px 12px; border-radius: 4px; display: inline-block; cursor: help;">' + (performanceScore * 100).toFixed(1) + '%</span>' : '-'}
                </td>
                <td class="cpu-only-column" style="display: ${componentType === 'cpu' ? '' : 'none'};">
                    ${multiThreadPerformanceScore !== null ? '<span class="performance-score" title="Performance based on data from https://www.tomshardware.com/" style="background: ' + this.getPerformanceColor(multiThreadPerformanceScore * 100) + '; color: white; font-weight: 600; padding: 4px 12px; border-radius: 4px; display: inline-block; cursor: help;">' + (multiThreadPerformanceScore * 100).toFixed(1) + '%</span>' : '-'}
                </td>
                <td class="price-cell">
                    ${isOnSale ? `
                        <div class="sale-price">$${salePrice.toFixed(2)}</div>
                        <div class="original-price strikethrough">$${basePrice.toFixed(2)}</div>
                        <span class="discount-badge" style="background: ${this.getDiscountColor(discount)}">${discount}% OFF</span>
                    ` : `
                        <div class="current-price">$${basePrice.toFixed(2)}</div>
                    `}
                </td>
            `;
        }

        // Apply gray-out styling for incompatible CPUs
        if (componentType === 'cpu' && !isCpuCompatible) {
            row.style.opacity = '0.4';
            row.setAttribute('data-incompatible', 'true');
        }

        // Apply gray-out styling for incompatible RAM
        if (componentType === 'ram' && !isRamCompatible) {
            row.style.opacity = '0.4';
            row.setAttribute('data-incompatible', 'true');
        }

        // Apply gray-out styling for incompatible coolers
        if (componentType === 'cooler' && !isCoolerCompatible) {
            row.style.opacity = '0.4';
            row.setAttribute('data-incompatible', 'true');
        }

        // Apply gray-out styling for incompatible cases
        if (componentType === 'case' && !isCaseCompatible) {
            row.style.opacity = '0.4';
            row.setAttribute('data-incompatible', 'true');
        }

        // Apply gray-out styling for motherboards incompatible with selected case
        if (componentType === 'motherboard' && !isMotherboardCaseCompatible) {
            row.style.opacity = '0.4';
            row.setAttribute('data-incompatible', 'true');
        }

        // Add click handler for expansion if variants exist
        if (hasVariants) {
            row.style.cursor = 'pointer';
            row.addEventListener('click', (e) => {
                this.toggleComponentVariants(row, component, componentType, index, true); // true = auto-select all variants
            });
        } else {
            // If no variants, clicking the row shows details first
            row.style.cursor = 'pointer';
            row.addEventListener('click', (e) => {
                // Show component details in the side panel
                this.showSingleComponentDetails(component, componentType, index);
            });
        }

        return row;
    }

    showSingleComponentDetails(component, componentType, index) {
        // Initialize comparison array if it doesn't exist
        if (!this.comparisonComponents) {
            this.comparisonComponents = [];
            this.currentComparisonIndex = 0;
        }

        const componentId = component._id || component.title;

        // Check if this component is already in the comparison list
        const existingIndex = this.comparisonComponents.findIndex(c =>
            (c.component._id || c.component.title) === componentId
        );

        if (existingIndex !== -1) {
            // Component already selected - remove it (toggle off)
            this.removeFromComparisonByIndex(existingIndex);

            // If no more components in comparison, just return
            if (this.comparisonComponents.length === 0) {
                return;
            }
            return;
        }

        // Add new component to comparison
        this.comparisonComponents.push({ component, componentType, variantIndex: 0 });
        this.currentComparisonIndex = this.comparisonComponents.length - 1;

        // Store current selection for the "Add to Build" or "Select This CPU" button
        this.currentDetailSelection = { component, componentType, variantIndex: 0 };

        // Add visual selection indicator to the row
        const componentRow = document.querySelector(`tr.component-main-row[data-component-id="${componentId}"]`);
        if (componentRow) {
            componentRow.classList.add('component-selected');
            // Add highlight styling to the selected row
            componentRow.style.backgroundColor = 'rgba(37, 99, 235, 0.08)';
            componentRow.style.borderLeft = '3px solid #2563eb';

            // Add checkmark indicator if not present
            if (!componentRow.querySelector('.selection-indicator')) {
                const indicator = document.createElement('div');
                indicator.className = 'selection-indicator';
                indicator.innerHTML = '<i class="fas fa-check-circle"></i>';
                indicator.style.cssText = 'position: absolute; right: 8px; top: 50%; transform: translateY(-50%); color: #2563eb; font-size: 18px; pointer-events: none;';
                const firstCell = componentRow.querySelector('td');
                if (firstCell) {
                    firstCell.style.position = 'relative';
                    firstCell.appendChild(indicator);
                }
            }
        }

        // Close statistics panel if it's open
        this.closeStatisticsPanel();

        // Render the comparison view and show the details panel
        this.renderComparisonView();
        const panel = document.getElementById('componentDetailsPanel');
        panel.classList.remove('hidden');

        // Create mobile toggle button if on mobile
        this.createMobileDetailsToggle();

        // Unround modal right corners
        const modalContent = document.querySelector('.modal-content');
        console.log('showSingleComponentDetails - Found modal-content:', modalContent);
        if (modalContent) {
            console.log('Before:', modalContent.style.borderRadius);
            modalContent.style.setProperty('border-radius', '12px 0 0 12px', 'important');
            console.log('After:', modalContent.style.borderRadius);
            console.log('Computed style:', window.getComputedStyle(modalContent).borderRadius);
        }
    }

    createMobileDetailsToggle() {
        // Only on mobile
        if (window.innerWidth > 1024) return;

        // Determine which panel is currently open
        const detailsPanel = document.getElementById('componentDetailsPanel');
        const statisticsPanel = document.getElementById('statisticsPanel');
        const isDetailsVisible = detailsPanel && !detailsPanel.classList.contains('hidden');
        const isStatisticsVisible = statisticsPanel && !statisticsPanel.classList.contains('hidden');

        // Set the active panel for toggle function
        if (isStatisticsVisible) {
            this.lastActiveMobilePanel = 'statistics';
        } else if (isDetailsVisible) {
            this.lastActiveMobilePanel = 'details';
        }

        // Check if already exists
        let toggleBtn = document.getElementById('mobileDetailsToggle');
        if (!toggleBtn) {
            // Create the button
            toggleBtn = document.createElement('button');
            toggleBtn.id = 'mobileDetailsToggle';
            toggleBtn.className = 'mobile-details-toggle panel-visible';
            toggleBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            toggleBtn.onclick = () => this.toggleMobileDetails();
            document.body.appendChild(toggleBtn);
        } else {
            // Update button state
            toggleBtn.classList.add('panel-visible');
            toggleBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
        }
    }

    toggleMobileDetails() {
        const detailsPanel = document.getElementById('componentDetailsPanel');
        const statisticsPanel = document.getElementById('statisticsPanel');
        const toggleBtn = document.getElementById('mobileDetailsToggle');

        // Determine which panel is currently visible
        const isDetailsVisible = !detailsPanel.classList.contains('hidden');
        const isStatisticsVisible = !statisticsPanel.classList.contains('hidden');

        // Toggle whichever panel is visible, or the last active one if both are hidden
        if (isStatisticsVisible || (!isDetailsVisible && this.lastActiveMobilePanel === 'statistics')) {
            // Toggle statistics panel
            if (statisticsPanel.classList.contains('hidden')) {
                statisticsPanel.classList.remove('hidden');
                toggleBtn.classList.add('panel-visible');
                toggleBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            } else {
                statisticsPanel.classList.add('hidden');
                toggleBtn.classList.remove('panel-visible');
                toggleBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            }
            this.lastActiveMobilePanel = 'statistics';
        } else {
            // Toggle details panel (default if nothing else)
            if (detailsPanel.classList.contains('hidden')) {
                detailsPanel.classList.remove('hidden');
                toggleBtn.classList.add('panel-visible');
                toggleBtn.innerHTML = '<i class="fas fa-chevron-right"></i>';
            } else {
                detailsPanel.classList.add('hidden');
                toggleBtn.classList.remove('panel-visible');
                toggleBtn.innerHTML = '<i class="fas fa-chevron-left"></i>';
            }
            this.lastActiveMobilePanel = 'details';
        }
    }

    async toggleComponentVariants(mainRow, component, componentType, index, autoSelectAllVariants = true) {
        const tbody = mainRow.parentElement;
        const expandIcon = mainRow.querySelector('.expand-icon');

        // Check if already expanded
        const existingExpandedRow = mainRow.nextElementSibling;
        if (existingExpandedRow && existingExpandedRow.classList.contains('variants-row')) {
            // Collapse - remove variants from comparison panel
            const cacheKey = component._id || component.collection || component.title || `${componentType}_${index}`;
            const variants = this.variantsCache.get(cacheKey);

            if (variants && variants.length > 0 && this.comparisonComponents) {
                // Remove all variants from this dropdown from the comparison panel
                variants.forEach(variant => {
                    const variantId = variant._id || variant.title;
                    const variantIndex = this.comparisonComponents.findIndex(item => {
                        const existingId = item.component._id || item.component.title;
                        return existingId === variantId;
                    });

                    if (variantIndex !== -1) {
                        this.comparisonComponents.splice(variantIndex, 1);
                    }
                });

                // Update the comparison view or hide if empty
                if (this.comparisonComponents.length === 0) {
                    // Hide the panel if no components left
                    const panel = document.getElementById('componentDetailsPanel');
                    panel.classList.add('hidden');
                } else {
                    // Adjust current index if needed
                    if (this.currentComparisonIndex >= this.comparisonComponents.length) {
                        this.currentComparisonIndex = this.comparisonComponents.length - 1;
                    }
                    // Re-render the comparison view
                    this.renderComparisonView();
                }
            }

            existingExpandedRow.remove();
            expandIcon.classList.remove('fa-chevron-down');
            expandIcon.classList.add('fa-chevron-right');
            mainRow.classList.remove('expanded');
            return;
        }

        // Expand
        expandIcon.classList.remove('fa-chevron-right');
        expandIcon.classList.add('fa-chevron-down');
        mainRow.classList.add('expanded');

        // Create expanded row with loading message
        const expandedRow = document.createElement('tr');
        expandedRow.classList.add('variants-row');
        expandedRow.innerHTML = `
            <td colspan="7">
                <div class="variants-container">
                    <div class="variants-header">Loading variants...</div>
                    <div class="variants-list">
                        <div style="text-align: center; padding: 20px;">
                            <i class="fas fa-spinner fa-spin"></i> Fetching individual cards...
                        </div>
                    </div>
                </div>
            </td>
        `;

        // Insert after main row
        mainRow.insertAdjacentElement('afterend', expandedRow);

        // Fetch variants from API
        try {
            const variants = await this.fetchComponentVariants(component, componentType);

            // Create a unique cache key for this component
            const cacheKey = component._id || component.collection || component.title || `${componentType}_${index}`;

            // Store variants in cache with unique key
            this.variantsCache.set(cacheKey, variants);

            // For GPUs, automatically load all variants into the comparison panel BEFORE rendering
            // Only do this if autoSelectAllVariants is true (manual user click)
            if (autoSelectAllVariants && componentType === 'gpu' && variants && variants.length > 0) {
                // Initialize comparison array if it doesn't exist
                if (!this.comparisonComponents) {
                    this.comparisonComponents = [];
                    this.currentComparisonIndex = 0;
                }

                // Sort variants by price and select only the two cheapest that meet the price filter
                const sortedForSelection = variants
                    .map((variant, originalIndex) => {
                        const bp = parseFloat(variant.basePrice) || 0;
                        const sp = parseFloat(variant.salePrice || variant.currentPrice) || 0;
                        const price = sp > 0 ? sp : bp;
                        return { variant, originalIndex, price };
                    })
                    .filter(({ price }) => {
                        if (this.minPrice !== null && price < this.minPrice) return false;
                        if (this.maxPrice !== null && price > this.maxPrice) return false;
                        return true;
                    })
                    .sort((a, b) => a.price - b.price)
                    .slice(0, 2);

                sortedForSelection.forEach(({ variant }) => {
                    const variantId = variant._id || variant.title;
                    const alreadyExists = this.comparisonComponents.some(item => {
                        const existingId = item.component._id || item.component.title;
                        return existingId === variantId;
                    });

                    if (!alreadyExists) {
                        this.comparisonComponents.push({
                            component: variant,
                            componentType: 'gpu',
                            variantIndex: this.comparisonComponents.length
                        });
                    }
                });

                // Show the details panel with the cheapest selected variant
                const cheapestSelected = sortedForSelection.length > 0 ? sortedForSelection[0].variant : variants[0];
                this.currentDetailSelection = {
                    component: cheapestSelected,
                    componentType: 'gpu',
                    variantIndex: 0
                };

                // Update comparison index to show the cheapest selected variant
                const firstVariantId = cheapestSelected._id || cheapestSelected.title;
                const firstVariantIndex = this.comparisonComponents.findIndex(item => {
                    const itemId = item.component._id || item.component.title;
                    return itemId === firstVariantId;
                });
                if (firstVariantIndex !== -1) {
                    this.currentComparisonIndex = firstVariantIndex;
                }

                // Close statistics panel if it's open
                this.closeStatisticsPanel();

                // Render and show the panel
                this.renderComparisonView();
                const panel = document.getElementById('componentDetailsPanel');
                panel.classList.remove('hidden');
                // Create mobile toggle button if on mobile
                this.createMobileDetailsToggle();
            }

            // Update the expanded row with actual variants (after setting comparison components)
            expandedRow.innerHTML = `
                <td colspan="7">
                    <div class="variants-container">
                        <div class="variants-header">Available Variants (${variants.length} cards):</div>
                        <div class="variants-list">
                            ${this.createVariantsList(variants, component, componentType, index, cacheKey)}
                        </div>
                    </div>
                </td>
            `;
        } catch (error) {
            console.error('Error fetching variants:', error);
            expandedRow.innerHTML = `
                <td colspan="7">
                    <div class="variants-container">
                        <div class="variants-header">Error loading variants</div>
                        <div class="no-variants">Could not load individual cards. Please try again.</div>
                    </div>
                </td>
            `;
        }
    }

    async fetchComponentVariants(component, componentType) {
        if (componentType !== 'gpu' || !component.collection) {
            return [];
        }

        // Fetch individual cards from the specific collection
        const response = await fetch(`/api/parts/gpus/${component.collection}`);
        if (!response.ok) {
            throw new Error('Failed to fetch variants');
        }

        const data = await response.json();

        // Extract the exact GPU model from the component name
        const componentName = (component.name || component.title || '').toUpperCase();

        console.log('Fetching variants for component:', componentName);

        // Filter variants to ensure we only get exact matching models
        const filteredData = data.filter(variant => {
            const variantName = (variant.name || variant.title || '').toUpperCase();
            const basePrice = parseFloat(variant.basePrice) || 0;

            // Filter out $0 cards
            if (basePrice <= 0) {
                return false;
            }

            // Extract model name from both component and variant using the same function
            const componentModel = this.extractGPUModelName(componentName);
            const variantModel = this.extractGPUModelName(variantName);

            console.log(`Comparing: component="${componentModel}" vs variant="${variantModel}"`);

            // Only include variants that exactly match the component model
            return componentModel === variantModel;
        });

        console.log(`Filtered ${filteredData.length} variants for ${componentName}`);
        return filteredData;
    }

    createVariantsList(variants, baseComponent, componentType, baseIndex, cacheKey) {
        if (!variants || variants.length === 0) {
            return '<div class="no-variants">No individual cards available</div>';
        }

        // Find the cheapest variant price (only when there are multiple)
        let cheapestPrice = Infinity;
        if (variants.length > 1) {
            variants.forEach(v => {
                const sp = parseFloat(v.salePrice || v.currentPrice) || 0;
                const bp = parseFloat(v.basePrice) || 0;
                const p = sp > 0 ? sp : bp;
                if (p > 0 && p < cheapestPrice) cheapestPrice = p;
            });
        }

        // Sort variants by price (cheapest first), preserving original index for cache lookups
        const sortedVariants = variants.map((variant, originalIndex) => {
            const sp = parseFloat(variant.salePrice || variant.currentPrice) || 0;
            const bp = parseFloat(variant.basePrice) || 0;
            const effectivePrice = sp > 0 ? sp : bp;
            return { variant, originalIndex, effectivePrice };
        }).sort((a, b) => a.effectivePrice - b.effectivePrice);

        let html = '<div class="variants-grid">';

        sortedVariants.forEach(({ variant, originalIndex, effectivePrice }) => {
            const variantName = variant.title || variant.name || 'Variant';
            const variantBasePrice = parseFloat(variant.basePrice) || 0;
            const variantSalePrice = parseFloat(variant.salePrice || variant.currentPrice) || 0;
            const variantPrice = variantSalePrice > 0 ? variantSalePrice : variantBasePrice;
            const isOnSale = variant.isOnSale || (variantSalePrice > 0 && variantSalePrice < variantBasePrice);
            const discount = isOnSale && variantBasePrice > 0 ? Math.round(((variantBasePrice - variantSalePrice) / variantBasePrice) * 100) : 0;

            // Check if this variant is selected
            const variantId = variant._id || variant.title || originalIndex;
            const isSelected = this.isVariantSelected(variantId);

            // Check if this variant is a great value card
            const isGreatValue = this.greatValueGpuIds && this.greatValueGpuIds.has(variantId);

            // Check if this is the cheapest variant
            const isCheapest = variants.length > 1 && variantPrice > 0 && variantPrice === cheapestPrice;

            // Check if this variant meets the price filter
            let meetsPriceFilter = true;
            if (this.minPrice !== null && variantPrice < this.minPrice) {
                meetsPriceFilter = false;
            }
            if (this.maxPrice !== null && variantPrice > this.maxPrice) {
                meetsPriceFilter = false;
            }

            const grayedOutStyle = !meetsPriceFilter ? 'opacity: 0.4;' : '';

            const cheapestStyle = isCheapest ? 'border-left: 3px solid #22c55e;' : '';
            const cheapestPriceStyle = isCheapest ? 'color: #22c55e; font-weight: 700;' : '';

            html += `
                <div class="variant-card ${isSelected ? 'variant-selected' : ''} ${isCheapest ? 'variant-cheapest' : ''}" style="${grayedOutStyle}${cheapestStyle}"
                     onclick="pcBuilder.toggleVariantSelection('${componentType}', ${originalIndex}, '${cacheKey}')"
                     data-variant-id="${variantId}">
                    <div class="variant-info">
                        <div class="variant-name">
                            ${variantName}
                            ${isCheapest ? '<span class="best-price-badge" style="display: inline-block; margin-left: 6px; padding: 2px 6px; background: rgba(34, 197, 94, 0.15); color: #16a34a; border-radius: 3px; font-size: 9px; font-weight: 700; vertical-align: middle;">BEST PRICE</span>' : ''}
                            ${isGreatValue ? '<span class="great-value-badge-small" style="display: inline-block; margin-left: 6px; padding: 2px 6px; background: rgba(34, 197, 94, 0.15); color: #16a34a; border-radius: 3px; font-size: 9px; font-weight: 700; vertical-align: middle;">GREAT VALUE</span>' : ''}
                            ${!meetsPriceFilter ? '<span style="display: inline-block; margin-left: 6px; padding: 2px 6px; background: rgba(0, 0, 0, 0.1); color: #999; border-radius: 3px; font-size: 9px; font-weight: 700; vertical-align: middle;">OUT OF RANGE</span>' : ''}
                        </div>
                        <div class="variant-price" style="${cheapestPriceStyle}">
                            ${isOnSale ?
                                `<span class="original-price">$${variantBasePrice.toFixed(2)}</span>
                                 <span class="sale-price" ${isCheapest ? 'style="color: #22c55e;"' : ''}>$${variantSalePrice.toFixed(2)}</span>` :
                                `<span class="price" ${isCheapest ? 'style="color: #22c55e; font-weight: 700;"' : ''}>$${variantPrice.toFixed(2)}</span>`
                            }
                        </div>
                    </div>
                    ${isOnSale ? `<div class="variant-discount-badge"><span class="discount-badge-small">${discount}% OFF</span></div>` : ''}
                    ${isSelected ? '<div class="selection-indicator"><i class="fas fa-check-circle"></i></div>' : ''}
                </div>
            `;
        });

        html += '</div>';
        return html;
    }

    isVariantSelected(variantId) {
        if (!this.comparisonComponents || this.comparisonComponents.length === 0) {
            return false;
        }

        return this.comparisonComponents.some(item => {
            const itemId = item.component._id || item.component.title;
            return itemId === variantId;
        });
    }

    toggleVariantSelection(componentType, variantIndex, cacheKey) {
        // Get the variants from the cache using the cache key
        const variants = this.variantsCache.get(cacheKey);

        if (!variants || !variants[variantIndex]) {
            console.error('Variant not found in cache for key:', cacheKey);
            return;
        }

        const variant = variants[variantIndex];

        const variantId = variant._id || variant.title || variantIndex;

        // Check if already selected
        if (!this.comparisonComponents) {
            this.comparisonComponents = [];
        }

        const existingIndex = this.comparisonComponents.findIndex(item => {
            const itemId = item.component._id || item.component.title;
            return itemId === variantId;
        });

        if (existingIndex !== -1) {
            // Already selected - remove it
            this.comparisonComponents.splice(existingIndex, 1);

            // Update current index if needed
            if (this.currentComparisonIndex >= this.comparisonComponents.length && this.comparisonComponents.length > 0) {
                this.currentComparisonIndex = this.comparisonComponents.length - 1;
            }

            // Update the variant card styling
            const variantCard = document.querySelector(`.variant-card[data-variant-id="${variantId}"]`);
            if (variantCard) {
                variantCard.classList.remove('variant-selected');
                const indicator = variantCard.querySelector('.selection-indicator');
                if (indicator) indicator.remove();
            }

            // Update the comparison view if panel is open
            if (this.comparisonComponents.length > 0) {
                this.renderComparisonView();
                document.getElementById('componentDetailsPanel').classList.remove('hidden');
                // Create mobile toggle button if on mobile
                this.createMobileDetailsToggle();
            } else {
                this.closeDetailsPanel();
            }
        } else {
            // Not selected - add it
            this.comparisonComponents.push({ component: variant, componentType, variantIndex });
            this.currentComparisonIndex = this.comparisonComponents.length - 1;

            // Update the variant card styling
            const variantCard = document.querySelector(`.variant-card[data-variant-id="${variantId}"]`);
            if (variantCard) {
                variantCard.classList.add('variant-selected');
                // Add selection indicator if not present
                if (!variantCard.querySelector('.selection-indicator')) {
                    const indicator = document.createElement('div');
                    indicator.className = 'selection-indicator';
                    indicator.innerHTML = '<i class="fas fa-check-circle"></i>';
                    variantCard.appendChild(indicator);
                }
            }

            // Show the details panel
            this.showDetailsPanel(variant, componentType, variantIndex);
        }
    }

    selectComponent(componentType, component) {
        // If selecting a new CPU, check if we need to handle stock cooler
        if (componentType === 'cpu') {
            const coolerDiv = document.getElementById('selectedBuilderCooler');
            const hadStockCooler = coolerDiv && coolerDiv.getAttribute('data-stock-cooler') === 'true';

            // If there was a stock cooler and new CPU doesn't include one, remove it
            if (hadStockCooler && component.coolerIncluded !== true) {
                this.removeBuilderComponent('cooler');
            }
        }

        // Debug GPU selection
        if (componentType === 'gpu') {
            console.log('=== GPU SELECTION DEBUG ===');
            console.log('Selecting GPU with data:', {
                _id: component._id,
                title: component.title,
                name: component.name,
                imageUrl: component.imageUrl,
                image: component.image,
                manufacturer: component.manufacturer
            });
            console.log('===========================');
        }

        // Store the selected component
        this.currentBuild[componentType] = component;

        // Initialize quantity for GPU if not set
        if (componentType === 'gpu' && !component.quantity) {
            component.quantity = 1;
        }

        // If selecting a motherboard, check if current RAM quantity exceeds slot capacity
        if (componentType === 'motherboard' && this.currentBuild.ram) {
            const ram = this.currentBuild.ram;
            const memorySlots = component.ramSlots || component.specifications?.ramSlots || 4;
            const kitSize = ram.kitSize || 1;
            const currentQuantity = ram.quantity || 1;
            const maxQuantity = Math.floor(memorySlots / kitSize);

            // If current RAM quantity exceeds capacity, reduce to max allowed
            if (currentQuantity > maxQuantity) {
                ram.quantity = maxQuantity;
                // Re-display the RAM component with updated quantity
                this.updateBuilderComponentDisplay('ram', ram);
            }
        }

        // If selecting a motherboard, check if current GPU quantity exceeds PCIe slot capacity
        if (componentType === 'motherboard' && this.currentBuild.gpu) {
            const gpu = this.currentBuild.gpu;

            // Try to get PCIe slot count from various fields
            const pcieSlotCount = component.pcieSlots || component.specifications?.pcieSlots || 0;

            let maxGPUs = 1;
            if (pcieSlotCount > 0) {
                // Estimate based on form factor
                const formFactor = (component.formFactor || '').toUpperCase();
                if (formFactor.includes('ITX')) {
                    maxGPUs = 1;
                } else if (formFactor.includes('MATX') || formFactor.includes('M-ATX')) {
                    maxGPUs = Math.min(2, pcieSlotCount);
                } else if (formFactor.includes('EATX') || formFactor.includes('E-ATX')) {
                    maxGPUs = Math.min(4, pcieSlotCount);
                } else { // ATX
                    maxGPUs = Math.min(3, pcieSlotCount);
                }
            } else {
                // Fallback based on form factor alone
                const formFactor = (component.formFactor || '').toUpperCase();
                if (formFactor.includes('ITX')) {
                    maxGPUs = 1;
                } else if (formFactor.includes('MATX') || formFactor.includes('M-ATX')) {
                    maxGPUs = 2;
                } else {
                    maxGPUs = 2; // Default for ATX
                }
            }

            const currentQuantity = gpu.quantity || 1;

            // If current GPU quantity exceeds available slots, reduce to max allowed
            if (currentQuantity > maxGPUs) {
                gpu.quantity = maxGPUs;
            }

            // Always re-display the GPU component to show/update the quantity button
            this.updateBuilderComponentDisplay('gpu', gpu);
        }

        // Update the UI
        this.updateBuilderComponentDisplay(componentType, component);

        // Update related components to refresh their compatibility status
        if (componentType === 'cpu') {
            // CPU was selected, refresh motherboard and cooler to check compatibility
            if (this.currentBuild.motherboard) {
                this.updateBuilderComponentDisplay('motherboard', this.currentBuild.motherboard);
            }
            if (this.currentBuild.cooler) {
                this.updateBuilderComponentDisplay('cooler', this.currentBuild.cooler);
            }
        } else if (componentType === 'ram' && this.currentBuild.motherboard) {
            // RAM was selected, refresh motherboard to check compatibility
            this.updateBuilderComponentDisplay('motherboard', this.currentBuild.motherboard);
        } else if (componentType === 'motherboard') {
            // Motherboard was selected, refresh CPU, RAM, case, and cooler to check compatibility
            if (this.currentBuild.cpu) {
                this.updateBuilderComponentDisplay('cpu', this.currentBuild.cpu);
            }
            if (this.currentBuild.ram) {
                this.updateBuilderComponentDisplay('ram', this.currentBuild.ram);
            }
            if (this.currentBuild.case) {
                this.updateBuilderComponentDisplay('case', this.currentBuild.case);
            }
            if (this.currentBuild.cooler) {
                this.updateBuilderComponentDisplay('cooler', this.currentBuild.cooler);
            }
        } else if (componentType === 'case' && this.currentBuild.motherboard) {
            // Case was selected, refresh motherboard to check compatibility
            this.updateBuilderComponentDisplay('motherboard', this.currentBuild.motherboard);
        } else if (componentType === 'cooler' && this.currentBuild.cpu) {
            // Cooler was selected, ensure it displays with correct compatibility status
            // (No need to refresh CPU, just ensure cooler styling is correct)
        }

        // If selecting a CPU with included cooler, show stock cooler if no cooler selected
        if (componentType === 'cpu' && component.coolerIncluded === true && !this.currentBuild.cooler) {
            this.showStockCooler(component);
        }
        // If selecting a CPU with included cooler but a stock cooler is already showing, update it
        else if (componentType === 'cpu' && component.coolerIncluded === true && this.currentBuild.cooler) {
            const coolerDiv = document.getElementById('selectedBuilderCooler');
            if (coolerDiv && coolerDiv.getAttribute('data-stock-cooler') === 'true') {
                this.showStockCooler(component);
            } else {
                // Custom cooler is selected, update the "Use Stock Cooler" button visibility
                this.updateStockCoolerButton();
            }
        }

        // If selecting a CPU, update the stock cooler button visibility
        if (componentType === 'cpu') {
            this.updateStockCoolerButton();
        }

        // If removing a CPU with included cooler, remove stock cooler display
        if (componentType === 'cooler' && this.currentBuild.cpu && this.currentBuild.cpu.coolerIncluded === true) {
            // User is manually selecting a cooler, so we'll override the stock cooler
            this.hideStockCooler();
        }

        this.updateTotalPrice();
        this.checkCompatibility();
        this.updateBuildActions();
        console.log('About to call updateBuildStatistics from selectComponent');
        this.updateBuildStatistics();
    }

    updateBuilderComponentDisplay(componentType, component) {
        const selectedDiv = document.getElementById(`selectedBuilder${this.capitalizeFirst(componentType)}`);
        const selectBtn = document.getElementById(`builder${this.capitalizeFirst(componentType)}SelectBtn`);
        const removeBtn = document.getElementById(`remove${this.capitalizeFirst(componentType)}Btn`);
        const priceSpan = document.getElementById(`${componentType}Price`);

        if (!selectedDiv || !selectBtn || !removeBtn) return;

        const name = component.title || component.name || '';
        const imageUrl = component.imageUrl || component.image || '';
        const amazonUrl = component.sourceUrl || component.url || '';
        const manufacturer = component.manufacturer || '';

        // Debug GPU display
        if (componentType === 'gpu') {
            console.log('=== DISPLAYING GPU IN BUILDER ===');
            console.log('Component title:', component.title);
            console.log('Component name:', component.name);
            console.log('Display name (used):', name);
            console.log('Name length:', name.length);
            console.log('=================================');
        }

        // Get quantity (for RAM and GPU)
        const quantity = (componentType === 'ram' || componentType === 'gpu') ? (component.quantity || 1) : 1;

        // Calculate prices with quantity multiplier
        const unitCurrentPrice = parseFloat(component.salePrice || component.currentPrice || component.basePrice) || 0;
        const unitBasePrice = parseFloat(component.basePrice) || unitCurrentPrice;
        const currentPrice = unitCurrentPrice * quantity;
        const basePrice = unitBasePrice * quantity;
        const isOnSale = component.isOnSale || (unitCurrentPrice < unitBasePrice);

        // Calculate discount (based on unit price, not total)
        const discount = isOnSale && unitBasePrice > 0 ? Math.round(((unitBasePrice - unitCurrentPrice) / unitBasePrice) * 100) : 0;

        // Get storage-specific details
        const isStorage = componentType === 'storage' || componentType.startsWith('storage');
        let storageDetails = '';
        if (isStorage) {
            const storageType = component.type || '';
            const capacity = component.capacity ? `${component.capacity} GB` : '';
            if (storageType || capacity) {
                storageDetails = `
                    <div class="component-specs" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e0e0e0;">
                        ${storageType ? `<div class="spec-item" style="font-size: 13px; color: #666; margin-bottom: 4px;"><strong>Type:</strong> ${storageType}</div>` : ''}
                        ${capacity ? `<div class="spec-item" style="font-size: 13px; color: #666;"><strong>Capacity:</strong> ${capacity}</div>` : ''}
                    </div>
                `;
            }
        }

        // Get RAM-specific badge overlay
        const isRAM = componentType === 'ram';
        let ramBadge = '';
        if (isRAM) {
            const totalCapacity = component.totalCapacity || 0;
            const kitSize = component.kitSize || 0;
            const moduleSize = component.capacity || (kitSize > 0 ? totalCapacity / kitSize : 0);

            // Get current quantity (default to 1)
            const currentQuantity = component.quantity || 1;

            if (totalCapacity > 0 && kitSize > 0) {
                ramBadge = `
                    <div style="position: absolute; bottom: 54px; right: 8px; background: rgba(0,0,0,0.85); color: white; padding: 6px 10px; border-radius: 6px; font-weight: 600; font-size: 13px; line-height: 1.3; box-shadow: 0 2px 8px rgba(0,0,0,0.3); z-index: 10; text-align: right;">
                        <div style="font-size: 16px;">${totalCapacity * currentQuantity}GB</div>
                        <div style="font-size: 11px; opacity: 0.9;">${kitSize * currentQuantity}x${moduleSize}GB</div>
                    </div>
                    <button id="ramQuantityBtn_${componentType}" style="position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.85); color: white; padding: 8px 12px; border-radius: 6px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); z-index: 10; border: none; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.95)'" onmouseout="this.style.background='rgba(0,0,0,0.85)'" onclick="event.preventDefault(); event.stopPropagation(); pcBuilder.cycleRAMQuantity('${componentType}')">
                        ${currentQuantity}x
                    </button>
                `;
            }
        }

        // Get GPU-specific badge overlay
        const isGPU = componentType === 'gpu';
        let gpuBadge = '';
        if (isGPU && this.currentBuild.motherboard) {
            // Only show GPU quantity button if motherboard is selected
            // Get current quantity (default to 1)
            const currentQuantity = component.quantity || 1;

            gpuBadge = `
                <button id="gpuQuantityBtn_${componentType}" style="position: absolute; bottom: 8px; left: 8px; background: rgba(0,0,0,0.85); color: white; padding: 8px 12px; border-radius: 6px; font-weight: 600; font-size: 14px; box-shadow: 0 2px 8px rgba(0,0,0,0.3); z-index: 10; border: none; cursor: pointer; transition: background 0.2s;" onmouseover="this.style.background='rgba(0,0,0,0.95)'" onmouseout="this.style.background='rgba(0,0,0,0.85)'" onclick="event.preventDefault(); event.stopPropagation(); pcBuilder.cycleGPUQuantity('${componentType}')">
                    ${currentQuantity}x
                </button>
            `;
        }

        // Check compatibility with motherboard
        let isCompatible = true;
        let incompatibilityMessage = '';
        let incompatibilityMessages = []; // Array to collect multiple issues

        if (this.currentBuild && this.currentBuild.motherboard) {
            const selectedMotherboard = this.currentBuild.motherboard;

            // Check CPU socket compatibility
            if (componentType === 'cpu') {
                const motherboardSocket = selectedMotherboard.socket || selectedMotherboard.socketType;
                const cpuSocket = component.socket || component.socketType;

                if (motherboardSocket && cpuSocket) {
                    const normalizedCpuSocket = cpuSocket.toString().trim().toUpperCase();
                    const normalizedMotherboardSocket = motherboardSocket.toString().trim().toUpperCase();
                    isCompatible = normalizedCpuSocket === normalizedMotherboardSocket;

                    if (!isCompatible) {
                        incompatibilityMessage = `Incompatible Socket: ${cpuSocket} (Requires ${motherboardSocket})`;
                    }
                }
            }

            // Check RAM memory type compatibility
            if (componentType === 'ram') {
                const motherboardMemoryTypes = selectedMotherboard.memoryType || [];
                const ramMemoryType = component.memoryType;

                const memoryTypesArray = Array.isArray(motherboardMemoryTypes) ? motherboardMemoryTypes : [motherboardMemoryTypes];

                if (memoryTypesArray.length > 0 && ramMemoryType) {
                    const normalizedRamType = ramMemoryType.toString().trim().toUpperCase();

                    isCompatible = memoryTypesArray.some(mbType => {
                        const normalizedMbType = mbType.toString().trim().toUpperCase();
                        return normalizedRamType.includes(normalizedMbType) || normalizedMbType.includes(normalizedRamType);
                    });

                    if (!isCompatible) {
                        const mbTypesStr = memoryTypesArray.join('/');
                        incompatibilityMessage = `Incompatible Memory: ${ramMemoryType} (Requires ${mbTypesStr})`;
                    }
                }
            }

            // Check motherboard compatibility with CPU and RAM
            if (componentType === 'motherboard') {
                // Check if motherboard socket is compatible with selected CPU
                if (this.currentBuild.cpu) {
                    const selectedCpu = this.currentBuild.cpu;
                    const motherboardSocket = component.socket || component.socketType;
                    const cpuSocket = selectedCpu.socket || selectedCpu.socketType;

                    if (motherboardSocket && cpuSocket) {
                        const normalizedCpuSocket = cpuSocket.toString().trim().toUpperCase();
                        const normalizedMotherboardSocket = motherboardSocket.toString().trim().toUpperCase();
                        const cpuCompatible = normalizedCpuSocket === normalizedMotherboardSocket;

                        if (!cpuCompatible) {
                            isCompatible = false;
                            incompatibilityMessages.push(`CPU Socket Mismatch: ${motherboardSocket} (CPU has ${cpuSocket})`);
                        }
                    }
                }

                // Check if motherboard memory type is compatible with selected RAM
                if (this.currentBuild.ram) {
                    const selectedRam = this.currentBuild.ram;
                    const motherboardMemoryTypes = component.memoryType || [];
                    const ramMemoryType = selectedRam.memoryType;

                    const memoryTypesArray = Array.isArray(motherboardMemoryTypes) ? motherboardMemoryTypes : [motherboardMemoryTypes];

                    if (memoryTypesArray.length > 0 && ramMemoryType) {
                        const normalizedRamType = ramMemoryType.toString().trim().toUpperCase();

                        const ramCompatible = memoryTypesArray.some(mbType => {
                            const normalizedMbType = mbType.toString().trim().toUpperCase();
                            return normalizedRamType.includes(normalizedMbType) || normalizedMbType.includes(normalizedRamType);
                        });

                        if (!ramCompatible) {
                            isCompatible = false;
                            const mbTypesStr = memoryTypesArray.join('/');
                            incompatibilityMessages.push(`RAM Type Mismatch: ${mbTypesStr} (RAM is ${ramMemoryType})`);
                        }
                    }
                }

                // Check if motherboard fits in selected case
                if (this.currentBuild.case) {
                    const selectedCase = this.currentBuild.case;
                    const caseFormFactors = selectedCase.formFactor || [];
                    const caseFormFactorArray = Array.isArray(caseFormFactors) ? caseFormFactors : [caseFormFactors];
                    const motherboardFormFactor = component.formFactor || '';

                    if (motherboardFormFactor && caseFormFactorArray.length > 0) {
                        let caseCompatible = false;

                        // Normalize motherboard form factor (handle all variants - remove hyphens and normalize spaces)
                        const moboFFUpper = motherboardFormFactor.toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();

                        // Check motherboard type (order matters: check more specific first)
                        const isMoboITX = moboFFUpper.includes('ITX') && !moboFFUpper.includes('ATX');
                        const isMoboMicroATX = moboFFUpper.includes('MATX') || moboFFUpper.includes('MICROATX');
                        const isMoboEATX = moboFFUpper.includes('EATX');
                        const isMoboATX = !isMoboITX && !isMoboMicroATX && !isMoboEATX && moboFFUpper.includes('ATX');

                        for (const caseFF of caseFormFactorArray) {
                            const caseFFUpper = caseFF.toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();

                            // Check case type (order matters: check more specific first)
                            const isCaseITX = caseFFUpper.includes('ITX') && !caseFFUpper.includes('ATX');
                            const isCaseMicroATX = caseFFUpper.includes('MATX') || caseFFUpper.includes('MICROATX');
                            const isCaseEATX = caseFFUpper.includes('EATX');
                            const isCaseATX = !isCaseITX && !isCaseMicroATX && !isCaseEATX && caseFFUpper.includes('ATX');

                            // E-ATX case accepts all motherboards
                            if (isCaseEATX) {
                                caseCompatible = true;
                                break;
                            }
                            // ATX case: compatible with ATX, mATX, ITX
                            else if (isCaseATX && (isMoboATX || isMoboMicroATX || isMoboITX)) {
                                caseCompatible = true;
                                break;
                            }
                            // mATX/Micro ATX case: compatible with mATX, ITX
                            else if (isCaseMicroATX && (isMoboMicroATX || isMoboITX)) {
                                caseCompatible = true;
                                break;
                            }
                            // ITX case: compatible with ITX only
                            else if (isCaseITX && isMoboITX) {
                                caseCompatible = true;
                                break;
                            }
                        }

                        if (!caseCompatible) {
                            isCompatible = false;
                            const caseFFDisplay = caseFormFactorArray.join('/');
                            incompatibilityMessages.push(`Too Large for Case: ${motherboardFormFactor} won't fit in ${caseFFDisplay} case`);
                        }
                    }
                }

                // Combine multiple incompatibility messages
                if (incompatibilityMessages.length > 0) {
                    incompatibilityMessage = incompatibilityMessages.join(' | ');
                }
            }

            // Check case compatibility with motherboard
            if (componentType === 'case' && this.currentBuild.motherboard) {
                const selectedMotherboard = this.currentBuild.motherboard;
                const motherboardFormFactor = selectedMotherboard.formFactor || '';
                const caseFormFactors = component.formFactor || [];
                const caseFormFactorArray = Array.isArray(caseFormFactors) ? caseFormFactors : [caseFormFactors];

                if (motherboardFormFactor && caseFormFactorArray.length > 0) {
                    let caseCompatible = false;

                    // Normalize motherboard form factor (handle all variants - remove hyphens and normalize spaces)
                    const moboFFUpper = motherboardFormFactor.toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();

                    // Check motherboard type (order matters: check more specific first)
                    const isMoboITX = moboFFUpper.includes('ITX') && !moboFFUpper.includes('ATX');
                    const isMoboMicroATX = moboFFUpper.includes('MATX') || moboFFUpper.includes('MICROATX');
                    const isMoboEATX = moboFFUpper.includes('EATX');
                    const isMoboATX = !isMoboITX && !isMoboMicroATX && !isMoboEATX && moboFFUpper.includes('ATX');

                    for (const caseFF of caseFormFactorArray) {
                        const caseFFUpper = caseFF.toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();

                        // Check case type (order matters: check more specific first)
                        const isCaseITX = caseFFUpper.includes('ITX') && !caseFFUpper.includes('ATX');
                        const isCaseMicroATX = caseFFUpper.includes('MATX') || caseFFUpper.includes('MICROATX');
                        const isCaseEATX = caseFFUpper.includes('EATX');
                        const isCaseATX = !isCaseITX && !isCaseMicroATX && !isCaseEATX && caseFFUpper.includes('ATX');

                        // E-ATX case accepts all motherboards
                        if (isCaseEATX) {
                            caseCompatible = true;
                            break;
                        }
                        // ATX case: compatible with ATX, mATX, ITX
                        else if (isCaseATX && (isMoboATX || isMoboMicroATX || isMoboITX)) {
                            caseCompatible = true;
                            break;
                        }
                        // mATX/Micro ATX case: compatible with mATX, ITX
                        else if (isCaseMicroATX && (isMoboMicroATX || isMoboITX)) {
                            caseCompatible = true;
                            break;
                        }
                        // ITX case: compatible with ITX only
                        else if (isCaseITX && isMoboITX) {
                            caseCompatible = true;
                            break;
                        }
                    }

                    if (!caseCompatible) {
                        isCompatible = false;
                        const caseFFDisplay = caseFormFactorArray.join('/');
                        incompatibilityMessage = `Too Small for Motherboard: ${caseFFDisplay} case won't fit ${motherboardFormFactor} motherboard`;
                    }
                }
            }
        }

        // Check cooler socket compatibility with CPU
        if (componentType === 'cooler' && this.currentBuild && this.currentBuild.cpu) {
            const selectedCpu = this.currentBuild.cpu;
            const cpuSocket = selectedCpu.socket || selectedCpu.socketType;
            const coolerSockets = component.socketCompatibility || [];

            if (cpuSocket && coolerSockets.length > 0) {
                // Helper function to normalize socket names (e.g., sTRX5 = TR5, LGA 1700 = LGA1700)
                const normalizeSocket = (socket) => {
                    return socket.toString().trim().toUpperCase().replace(/\s+/g, '').replace('STRX', 'TR');
                };

                const normalizedCpuSocket = normalizeSocket(cpuSocket);

                // Check if the CPU socket is in the cooler's compatibility list
                const isCoolerCompatible = coolerSockets.some(coolerSocket => {
                    const normalizedCoolerSocket = normalizeSocket(coolerSocket);

                    // Direct match
                    if (normalizedCpuSocket === normalizedCoolerSocket) return true;

                    // Handle LGA115x wildcard (matches 1150, 1151, 1155, 1156)
                    if (normalizedCoolerSocket === 'LGA115X' &&
                        (normalizedCpuSocket === 'LGA1150' || normalizedCpuSocket === 'LGA1151' ||
                         normalizedCpuSocket === 'LGA1155' || normalizedCpuSocket === 'LGA1156')) {
                        return true;
                    }

                    return false;
                });

                if (!isCoolerCompatible) {
                    isCompatible = false;
                    const coolerSocketsDisplay = coolerSockets.join(', ');
                    incompatibilityMessage = `Incompatible Socket: Cooler supports ${coolerSocketsDisplay} (CPU has ${cpuSocket})`;
                }
            }
        }

        // Create stock cooler button HTML for cooler components
        const stockCoolerBtn = componentType === 'cooler' ? `
            <button id="useStockCoolerBtn" style="display: none; position: absolute; top: 54px; left: 12px; background: #ef4444; color: white; border: none; border-radius: 6px; width: 36px; height: 36px; cursor: pointer; transition: all 0.2s; z-index: 10; box-shadow: 0 2px 8px rgba(239, 68, 68, 0.3);" onmouseover="this.style.background='#dc2626'; this.style.transform='scale(1.1)'; this.style.boxShadow='0 4px 12px rgba(239, 68, 68, 0.4)';" onmouseout="this.style.background='#ef4444'; this.style.transform='scale(1)'; this.style.boxShadow='0 2px 8px rgba(239, 68, 68, 0.3)';" onclick="pcBuilder.useStockCooler()" title="Use Stock Cooler">
                <i class="fas fa-times" style="font-size: 14px;"></i>
            </button>
        ` : '';

        // Create detailed component card similar to details panel
        const detailsHTML = `
            <div class="builder-component-card ${!isCompatible ? 'incompatible-build-card' : ''}">
                <button class="swap-component-btn ${!isCompatible ? 'incompatible-swap-btn' : ''}" onclick="pcBuilder.swapComponent('${componentType}')" title="Swap Component">
                    <i class="fas fa-exchange-alt"></i>
                </button>
                ${stockCoolerBtn}
                ${amazonUrl ? `<a href="${amazonUrl}" target="_blank" class="detail-product-link">` : ''}
                    <div class="detail-image-container ${!isCompatible ? 'incompatible-build-component' : ''}" style="position: relative;">
                        ${imageUrl ?
                            `<img src="${imageUrl}" alt="${name}" class="detail-image" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'detail-image-placeholder\\'><i class=\\'fas fa-microchip\\' style=\\'font-size: 48px; color: #ddd;\\'></i></div>';">` :
                            `<div class="detail-image-placeholder"><i class="fas fa-microchip" style="font-size: 48px; color: #ddd;"></i></div>`
                        }
                        ${!isCompatible ? `
                            <div class="incompatibility-overlay-center">
                                <i class="fas fa-exclamation-triangle"></i>
                            </div>
                            <div class="incompatibility-text-overlay">
                                ${incompatibilityMessage}
                            </div>
                        ` : ''}
                        ${ramBadge}
                        ${gpuBadge}
                        ${manufacturer && !componentType.startsWith('addon') ? `<div class="image-manufacturer-badge ${!isCompatible ? 'incompatible-badge' : ''}">${manufacturer}</div>` : ''}
                        ${isOnSale && discount > 0 ? `
                            <div class="image-price-overlay">
                                <div class="overlay-sale-price">$${currentPrice.toFixed(2)}</div>
                                <div class="overlay-original-price">$${basePrice.toFixed(2)}</div>
                                <div class="overlay-discount" style="background: #27ae60;">${discount}% OFF</div>
                            </div>
                        ` : `
                            <div class="image-price-overlay">
                                <div class="overlay-current-price">$${currentPrice.toFixed(2)}</div>
                            </div>
                        `}
                    </div>
                ${amazonUrl ? `</a>` : ''}
                <div class="builder-component-info">
                    ${amazonUrl ? `<a href="${amazonUrl}" target="_blank" class="detail-title-link">` : ''}
                        <div class="detail-title">${name}</div>
                    ${amazonUrl ? `</a>` : ''}
                    ${storageDetails}
                </div>
            </div>
        `;

        selectedDiv.innerHTML = detailsHTML;

        // Update price span if it exists (some components may not have headers)
        if (priceSpan) {
            priceSpan.textContent = `$${currentPrice.toFixed(2)}`;
        }

        // Show selected component, hide select and remove buttons
        selectedDiv.style.display = 'block';
        selectBtn.style.display = 'none';
        removeBtn.style.display = 'none';

        // Add class to indicate component is selected
        selectedDiv.classList.add('component-selected');

        // If this is a cooler component, clear the stock cooler flag and update button visibility
        if (componentType === 'cooler') {
            // Remove stock cooler attribute since this is a custom cooler
            selectedDiv.removeAttribute('data-stock-cooler');
            this.updateStockCoolerButton();
        }

        // Note: updateComponentPositions() is not needed here - it's only called when
        // sections are added/removed/closed, not when selecting components
    }

    swapComponent(componentType) {
        // Open the component selector modal for the specified component type
        const selectBtn = document.getElementById(`builder${this.capitalizeFirst(componentType)}SelectBtn`);
        if (selectBtn) {
            selectBtn.click();
        }
    }

    cycleRAMQuantity(componentType) {
        // Get the current RAM component
        const ram = this.currentBuild[componentType];
        if (!ram) return;

        // Get current quantity or default to 1
        const currentQuantity = ram.quantity || 1;

        // Get the RAM kit size (how many modules in the kit)
        const kitSize = ram.kitSize || 1;

        // Get motherboard RAM slot count (default to 4 if no motherboard selected)
        let maxSlots = 4; // Default assumption
        if (this.currentBuild.motherboard) {
            const motherboard = this.currentBuild.motherboard;
            maxSlots = motherboard.ramSlots || motherboard.specifications?.ramSlots || 4;
        }

        // Calculate max quantity based on available slots
        // For example, if we have 4 slots and a 2x kit, max quantity is 2 (2 kits × 2 modules = 4 slots)
        const maxQuantity = Math.floor(maxSlots / kitSize);

        // Cycle through quantities: 1 → 2 → ... → maxQuantity → 1
        let newQuantity = currentQuantity + 1;
        if (newQuantity > maxQuantity) {
            newQuantity = 1; // Roll over to 1
        }

        // Update the quantity
        ram.quantity = newQuantity;

        // Re-render the component display
        this.updateBuilderComponentDisplay(componentType, ram);

        // Update total price
        this.updateTotalPrice();

        // Update build statistics (treemap)
        this.updateBuildStatistics();
    }

    cycleGPUQuantity(componentType) {
        // Get the current GPU component
        const gpu = this.currentBuild[componentType];
        if (!gpu) return;

        // Get current quantity or default to 1
        const currentQuantity = gpu.quantity || 1;

        // Get motherboard PCIe slot count (default to 1 if no motherboard selected)
        let maxGPUs = 1; // Default assumption
        if (this.currentBuild.motherboard) {
            const motherboard = this.currentBuild.motherboard;

            // Try to get PCIe slot count from various fields
            const pcieSlotCount = motherboard.pcieSlots || motherboard.specifications?.pcieSlots || 0;

            if (pcieSlotCount > 0) {
                // Most motherboards have at least 1-2 PCIe x16 slots
                // Estimate: ITX = 1, mATX = 2, ATX = 2-3, EATX = 3-4
                const formFactor = (motherboard.formFactor || '').toUpperCase();
                if (formFactor.includes('ITX')) {
                    maxGPUs = 1;
                } else if (formFactor.includes('MATX') || formFactor.includes('M-ATX')) {
                    maxGPUs = Math.min(2, pcieSlotCount);
                } else if (formFactor.includes('EATX') || formFactor.includes('E-ATX')) {
                    maxGPUs = Math.min(4, pcieSlotCount);
                } else { // ATX
                    maxGPUs = Math.min(3, pcieSlotCount);
                }
            } else {
                // Fallback based on form factor alone
                const formFactor = (motherboard.formFactor || '').toUpperCase();
                if (formFactor.includes('ITX')) {
                    maxGPUs = 1;
                } else if (formFactor.includes('MATX') || formFactor.includes('M-ATX')) {
                    maxGPUs = 2;
                } else {
                    maxGPUs = 2; // Default for ATX
                }
            }
        }

        // Cycle through quantities: 1 → 2 → ... → maxGPUs → 1
        let newQuantity = currentQuantity + 1;
        if (newQuantity > maxGPUs) {
            newQuantity = 1; // Roll over to 1
        }

        // Update the quantity
        gpu.quantity = newQuantity;

        // Re-render the component display
        this.updateBuilderComponentDisplay(componentType, gpu);

        // Update total price
        this.updateTotalPrice();

        // Update build statistics (treemap)
        this.updateBuildStatistics();
    }

    showStockCooler(cpu) {
        const selectedDiv = document.getElementById('selectedBuilderCooler');
        const selectBtn = document.getElementById('builderCoolerSelectBtn');
        const removeBtn = document.getElementById('removeCoolerBtn');

        if (!selectedDiv || !selectBtn || !removeBtn) return;

        // Determine image based on CPU manufacturer
        const manufacturer = (cpu.manufacturer || '').toLowerCase();
        let imageUrl = '';
        let coolerName = 'Stock Cooler';

        if (manufacturer.includes('intel')) {
            imageUrl = 'https://m.media-amazon.com/images/I/61RzGQM-ykL._AC_UF894,1000_QL80_.jpg';
            coolerName = 'Intel Stock Cooler';
        } else if (manufacturer.includes('amd')) {
            imageUrl = 'https://m.media-amazon.com/images/I/61MXXjImGQL.jpg';
            coolerName = 'AMD Stock Cooler';
        }

        const detailsHTML = `
            <div class="builder-component-card stock-cooler-card" style="padding-bottom: 12px;">
                <button class="swap-component-btn" onclick="pcBuilder.swapComponent('cooler')" title="Upgrade Cooler">
                    <i class="fas fa-exchange-alt"></i>
                </button>
                <div class="stock-cooler-badge" style="position: absolute; top: 25px; right: 85px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 6px 12px; border-radius: 6px; font-size: 11px; font-weight: 700; z-index: 10; box-shadow: 0 2px 8px rgba(16, 185, 129, 0.3);">
                    <i class="fas fa-gift" style="margin-right: 4px;"></i>INCLUDED
                </div>
                <div class="detail-image-container">
                    ${imageUrl ?
                        `<img src="${imageUrl}" alt="${coolerName}" class="detail-image" onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'detail-image-placeholder\\'><i class=\\'fas fa-snowflake\\' style=\\'font-size: 48px; color: #ddd;\\'></i></div>';">` :
                        `<div class="detail-image-placeholder"><i class="fas fa-snowflake" style="font-size: 48px; color: #ddd;"></i></div>`
                    }
                    <div class="image-manufacturer-badge">${cpu.manufacturer || ''}</div>
                    <div class="image-price-overlay" style="background: linear-gradient(135deg, #10b981 0%, #059669 100%);">
                        <div class="overlay-current-price" style="font-size: 18px;">FREE</div>
                    </div>
                </div>
                <div class="builder-component-info" style="padding: 8px 12px 0 12px;">
                    <div class="detail-title" style="margin-bottom: 3px; font-size: 14px;">${coolerName}</div>
                    <div class="stock-cooler-info" style="font-size: 10.5px; color: #666; line-height: 1.3;">
                        <div style="margin-bottom: 1px;">
                            <i class="fas fa-check-circle" style="margin-right: 3px; color: #10b981; font-size: 9px;"></i>
                            <span>Included with ${cpu.name || cpu.title}</span>
                        </div>
                        <div style="color: #999; font-style: italic; font-size: 9.5px;">
                            You can upgrade to a better cooler if needed
                        </div>
                    </div>
                </div>
            </div>
        `;

        selectedDiv.innerHTML = detailsHTML;
        selectedDiv.style.display = 'block';
        selectBtn.style.display = 'none';
        removeBtn.style.display = 'none';

        // Mark as stock cooler so we know to handle it specially
        selectedDiv.setAttribute('data-stock-cooler', 'true');
    }

    hideStockCooler() {
        const selectedDiv = document.getElementById('selectedBuilderCooler');
        if (selectedDiv && selectedDiv.getAttribute('data-stock-cooler') === 'true') {
            selectedDiv.removeAttribute('data-stock-cooler');
        }
    }

    updateStockCoolerButton() {
        const useStockCoolerBtn = document.getElementById('useStockCoolerBtn');
        console.log('updateStockCoolerButton called, button found:', !!useStockCoolerBtn);

        if (!useStockCoolerBtn) {
            console.log('useStockCoolerBtn element not found in DOM');
            return;
        }

        // Show the button only if:
        // 1. A CPU is selected
        // 2. The CPU includes a cooler (coolerIncluded === true)
        // 3. A custom cooler is selected (not a stock cooler)
        const cpu = this.currentBuild.cpu;
        const coolerDiv = document.getElementById('selectedBuilderCooler');
        const isStockCooler = coolerDiv && coolerDiv.getAttribute('data-stock-cooler') === 'true';
        const coolerDisplayed = coolerDiv && coolerDiv.style.display !== 'none';

        console.log('Stock cooler button check:', {
            hasCPU: !!cpu,
            cpuIncludesCooler: cpu?.coolerIncluded,
            coolerDisplayed: coolerDisplayed,
            isStockCooler: isStockCooler
        });

        // Show button if CPU has stock cooler AND a custom (non-stock) cooler is displayed
        if (cpu && cpu.coolerIncluded === true && coolerDisplayed && !isStockCooler) {
            console.log('Showing use stock cooler button');
            useStockCoolerBtn.style.display = 'inline-block';
        } else {
            console.log('Hiding use stock cooler button');
            useStockCoolerBtn.style.display = 'none';
        }
    }

    useStockCooler() {
        // Remove the custom cooler
        this.currentBuild.cooler = null;

        // Show the stock cooler
        if (this.currentBuild.cpu && this.currentBuild.cpu.coolerIncluded === true) {
            this.showStockCooler(this.currentBuild.cpu);
        }

        // Update prices and compatibility
        this.updateTotalPrice();
        this.checkCompatibility();
        this.updateBuildActions();
        this.updateBuildStatistics();

        // Hide the "Use Stock Cooler" button
        this.updateStockCoolerButton();
    }

    updateComponentPositions() {
        console.log('>>> updateComponentPositions called');
        // Get all component rows
        const allRows = Array.from(document.querySelectorAll('.component-row'));
        const dynamicRows = allRows.slice(4); // Start from row 5 (index 4)

        // Collect ALL storage and addon sections (not just enabled ones) to preserve them
        const allSections = [];

        // Storage sections 2-7 (Storage 1 is in fixed Row 4 with Case)
        for (let i = 2; i <= 7; i++) {
            const section = document.querySelector(`#storageSection${i}`);
            if (section) {
                allSections.push(section);
            }
        }

        // Addon sections 1-6
        for (let i = 1; i <= 6; i++) {
            const section = document.querySelector(`#addonSection${i}`);
            if (section) {
                allSections.push(section);
            }
        }

        // Filter to get only enabled sections for layout
        const enabledSections = allSections.filter(section => !section.classList.contains('disabled'));

        console.log(`Found ${enabledSections.length} enabled sections out of ${allSections.length} total`);

        // Redistribute enabled sections into rows (2 per row) using appendChild to preserve elements
        let sectionIndex = 0;

        dynamicRows.forEach((row, rowIndex) => {
            // Get sections that should be in this row
            const leftSection = enabledSections[sectionIndex];
            const rightSection = enabledSections[sectionIndex + 1];

            // Clear the row first
            while (row.firstChild) {
                row.removeChild(row.firstChild);
            }

            // Add left section if it exists
            if (leftSection) {
                leftSection.classList.remove('disabled');
                leftSection.style.display = '';
                leftSection.classList.remove('component-right');
                leftSection.classList.add('component-left');
                row.appendChild(leftSection);
                sectionIndex++;
            }

            // Add right section if it exists
            if (rightSection) {
                rightSection.classList.remove('disabled');
                rightSection.style.display = '';
                rightSection.classList.remove('component-left');
                rightSection.classList.add('component-right');
                row.appendChild(rightSection);
                sectionIndex++;
            }

            // Show row if it has at least one section, hide otherwise
            if (leftSection || rightSection) {
                row.style.display = 'flex';
            } else {
                row.style.display = 'none';
            }
        });

        // Put any disabled sections that aren't in rows back into a hidden container
        // This ensures they're not lost from the DOM
        const sectionsInRows = new Set();
        dynamicRows.forEach(row => {
            Array.from(row.children).forEach(child => sectionsInRows.add(child));
        });

        // Find a hidden row to store disabled sections
        const hiddenRow = dynamicRows.find(row => row.style.display === 'none');
        if (hiddenRow) {
            allSections.forEach(section => {
                if (!sectionsInRows.has(section) && section.classList.contains('disabled')) {
                    hiddenRow.appendChild(section);
                }
            });
        }

        // Apply centering logic for all rows
        allRows.forEach((row) => {
            const leftSection = row.querySelector('.component-left');
            const rightSection = row.querySelector('.component-right');

            if (leftSection && rightSection) {
                const leftDisabled = leftSection.classList.contains('disabled');
                const rightDisabled = rightSection.classList.contains('disabled');

                const leftSelector = leftSection.querySelector('.component-selector');
                const rightSelector = rightSection.querySelector('.component-selector');

                // Check if components have selections
                const leftSelected = leftSection.querySelector('.selected-component[style*="display: block"]') ||
                                   leftSection.querySelector('.selected-component.component-selected');
                const rightSelected = rightSection.querySelector('.selected-component[style*="display: block"]') ||
                                    rightSection.querySelector('.selected-component.component-selected');

                // If right component is selected, center left button
                if (rightSelected && leftSelector && !leftDisabled) {
                    leftSelector.classList.add('centered');
                } else if (leftSelector) {
                    leftSelector.classList.remove('centered');
                }

                // If left component is selected, center right button
                if (leftSelected && rightSelector && !rightDisabled) {
                    rightSelector.classList.add('centered');
                } else if (rightSelector) {
                    rightSelector.classList.remove('centered');
                }
            }
        });

        console.log('>>> updateComponentPositions complete');
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    getComponentSpecs(component, componentType) {
        switch (componentType) {
            case 'gpu':
                // VRAM is now in its own column, no specs needed
                return '';
            case 'cpu':
                const cpuSpecs = [];
                if (component.coreCount) cpuSpecs.push(`${component.coreCount} cores`);
                if (component.baseClock) cpuSpecs.push(`${component.baseClock}`);
                return cpuSpecs.join(', ');
            case 'motherboard':
                const mbSpecs = [];
                return mbSpecs.join(', ');
            case 'ram':
                const ramSpecs = [];
                if (component.capacity) ramSpecs.push(component.capacity);
                if (component.speed) ramSpecs.push(component.speed);
                return ramSpecs.join(' ');
            case 'cooler':
                // No specs needed - type is shown in column
                return '';
            case 'psu':
                // No specs needed - wattage, certification, and modularity are shown in columns
                return '';
            default:
                return '';
        }
    }

    sortComponentTable(column) {
        if (this.currentSortColumn === column) {
            this.currentSortDirection = this.currentSortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.currentSortColumn = column;
            this.currentSortDirection = 'asc';
        }

        // Update header styles
        document.querySelectorAll('.sortable').forEach(header => {
            header.classList.remove('sorted-asc', 'sorted-desc');
        });

        const currentHeader = document.querySelector(`[data-sort="${column}"]`);
        if (currentHeader) {
            currentHeader.classList.add(`sorted-${this.currentSortDirection}`);
        }

        // Re-populate table with new sort
        this.populateComponentTable(this.currentModalType);
    }

    sortComponentsForModal(components) {
        // If sorting by name and it's the default (asc), use smart GPU sorting
        if (this.currentSortColumn === 'name' && this.currentSortDirection === 'asc' && this.currentModalType === 'gpu') {
            return this.smartGpuSort(components);
        }

        components.sort((a, b) => {
            let aVal, bVal;

            switch (this.currentSortColumn) {
                case 'name':
                    aVal = (a.title || a.name || '').toLowerCase();
                    bVal = (b.title || b.name || '').toLowerCase();
                    break;
                case 'manufacturer':
                    aVal = (a.manufacturer || '').toLowerCase();
                    bVal = (b.manufacturer || '').toLowerCase();
                    break;
                case 'basePrice':
                    aVal = parseFloat(a.basePrice) || 0;
                    bVal = parseFloat(b.basePrice) || 0;
                    break;
                case 'salePrice':
                    aVal = parseFloat(a.salePrice || a.currentPrice) || parseFloat(a.basePrice) || 0;
                    bVal = parseFloat(b.salePrice || b.currentPrice) || parseFloat(b.basePrice) || 0;
                    break;
                case 'discount':
                    const aDiscount = this.calculateDiscount(a);
                    const bDiscount = this.calculateDiscount(b);
                    aVal = aDiscount;
                    bVal = bDiscount;
                    break;
                case 'performance':
                    if (this.currentModalType === 'cpu') {
                        aVal = this.getCpuPerformance(a) || 0;
                        bVal = this.getCpuPerformance(b) || 0;
                    } else {
                        aVal = this.getGpuPerformance(a) || 0;
                        bVal = this.getGpuPerformance(b) || 0;
                    }
                    break;
                case 'multiThreadPerformance':
                    aVal = this.getCpuMultiThreadPerformance(a) || 0;
                    bVal = this.getCpuMultiThreadPerformance(b) || 0;
                    break;
                case 'socket':
                    aVal = (a.socket || '').toLowerCase();
                    bVal = (b.socket || '').toLowerCase();
                    break;
                case 'chipset':
                    aVal = (a.chipset || '').toLowerCase();
                    bVal = (b.chipset || '').toLowerCase();
                    break;
                case 'formFactor':
                    // Sort form factors by size: Mini-ITX < Micro-ATX < ATX < E-ATX
                    const formFactorOrder = { 'mini-itx': 1, 'itx': 1, 'micro-atx': 2, 'matx': 2, 'atx': 3, 'e-atx': 4, 'eatx': 4 };
                    // Handle both arrays and strings for formFactor
                    const aFormFactor = Array.isArray(a.formFactor) ? (a.formFactor[0] || '') : (a.formFactor || '');
                    const bFormFactor = Array.isArray(b.formFactor) ? (b.formFactor[0] || '') : (b.formFactor || '');
                    aVal = formFactorOrder[aFormFactor.toLowerCase()] || 999;
                    bVal = formFactorOrder[bFormFactor.toLowerCase()] || 999;
                    break;
                case 'hasRGB':
                    // Sort by RGB availability (Yes before No)
                    aVal = (a.specifications?.hasRGB || false) ? 0 : 1;
                    bVal = (b.specifications?.hasRGB || false) ? 0 : 1;
                    break;
                case 'memoryType':
                    // Handle both arrays (motherboards) and strings (RAM)
                    if (Array.isArray(a.memoryType)) {
                        aVal = a.memoryType.length > 0 ? a.memoryType.join(', ').toLowerCase() : '';
                    } else {
                        aVal = (a.memoryType || '').toLowerCase();
                    }
                    if (Array.isArray(b.memoryType)) {
                        bVal = b.memoryType.length > 0 ? b.memoryType.join(', ').toLowerCase() : '';
                    } else {
                        bVal = (b.memoryType || '').toLowerCase();
                    }
                    break;
                case 'wifi':
                    // Sort by WiFi availability (Yes before No)
                    aVal = (a.networking?.wifi || false) ? 0 : 1;
                    bVal = (b.networking?.wifi || false) ? 0 : 1;
                    break;
                case 'capacity':
                    aVal = parseInt(a.capacity) || 0;
                    bVal = parseInt(b.capacity) || 0;
                    break;
                case 'speed':
                    aVal = parseInt(a.speed) || 0;
                    bVal = parseInt(b.speed) || 0;
                    break;
                case 'coolerType':
                    aVal = (a.coolerType || '').toLowerCase();
                    bVal = (b.coolerType || '').toLowerCase();
                    break;
                case 'type':
                    // Storage type sorting: M.2 SSD < SATA SSD < HDD
                    const typeOrder = { 'm.2 ssd': 1, 'sata ssd': 2, 'hdd': 3 };
                    const aType = (a.type || '').toLowerCase();
                    const bType = (b.type || '').toLowerCase();
                    aVal = typeOrder[aType] || 999;
                    bVal = typeOrder[bType] || 999;
                    break;
                case 'performanceTier':
                    aVal = (a.performanceTier || '').toLowerCase();
                    bVal = (b.performanceTier || '').toLowerCase();
                    break;
                case 'wattage':
                    aVal = parseInt(a.wattage) || 0;
                    bVal = parseInt(b.wattage) || 0;
                    break;
                case 'certification':
                    // Sort certifications by efficiency: Bronze < Silver < Gold < Platinum < Titanium
                    const certOrder = { 'bronze': 1, 'silver': 2, 'gold': 3, 'platinum': 4, 'titanium': 5 };
                    aVal = certOrder[(a.certification || '').toLowerCase()] || 0;
                    bVal = certOrder[(b.certification || '').toLowerCase()] || 0;
                    break;
                case 'modularity':
                    aVal = (a.modularity || '').toLowerCase();
                    bVal = (b.modularity || '').toLowerCase();
                    break;
                case 'ramSlots':
                    aVal = parseInt(a.ramSlots) || 0;
                    bVal = parseInt(b.ramSlots) || 0;
                    break;
                case 'm2Slots':
                    aVal = parseInt(a.m2Slots) || 0;
                    bVal = parseInt(b.m2Slots) || 0;
                    break;
                case 'pcieSlots':
                    aVal = parseInt(a.pcieSlots) || 0;
                    bVal = parseInt(b.pcieSlots) || 0;
                    break;
                case 'storageType':
                    // Sort storage types: M.2 SSD < SATA SSD < Other SSD < HDD
                    const storageTypeOrder = { 'm.2 ssd': 1, 'sata ssd': 2, 'other ssd': 3, 'hdd': 4 };
                    aVal = storageTypeOrder[(a.storageType || '').toLowerCase()] || 999;
                    bVal = storageTypeOrder[(b.storageType || '').toLowerCase()] || 999;
                    break;
                case 'capacityGB':
                    aVal = parseFloat(a.capacityGB) || 0;
                    bVal = parseFloat(b.capacityGB) || 0;
                    break;
                case 'releaseYear':
                    aVal = parseInt(a.releaseYear) || 0;
                    bVal = parseInt(b.releaseYear) || 0;
                    break;
                default:
                    aVal = 0;
                    bVal = 0;
            }

            if (typeof aVal === 'string') {
                return this.currentSortDirection === 'asc' ? aVal.localeCompare(bVal) : bVal.localeCompare(aVal);
            } else {
                return this.currentSortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            }
        });
    }

    smartGpuSort(components) {
        components.sort((a, b) => {
            const aName = (a.title || a.name || '').toUpperCase();
            const bName = (b.title || b.name || '').toUpperCase();
            const aMfg = (a.manufacturer || '').toUpperCase();
            const bMfg = (b.manufacturer || '').toUpperCase();

            // 1. Sort by manufacturer priority: NVIDIA > AMD > Intel > Others
            const mfgPriority = { 'NVIDIA': 1, 'AMD': 2, 'INTEL': 3 };
            const aPriority = mfgPriority[aMfg] || 999;
            const bPriority = mfgPriority[bMfg] || 999;

            if (aPriority !== bPriority) {
                return aPriority - bPriority;
            }

            // 2. Within same manufacturer, extract generation and model
            const aGenModel = this.extractGpuGenerationAndModel(aName, aMfg);
            const bGenModel = this.extractGpuGenerationAndModel(bName, bMfg);

            // 3. Sort by generation (newer first - higher generation number)
            if (aGenModel.generation !== bGenModel.generation) {
                return bGenModel.generation - aGenModel.generation; // Descending
            }

            // 4. Within same generation, sort by model number (higher first)
            if (aGenModel.model !== bGenModel.model) {
                return bGenModel.model - aGenModel.model; // Descending
            }

            // 5. Sort by tier (Ti Super > Ti > Super > regular)
            if (aGenModel.tier !== bGenModel.tier) {
                return aGenModel.tier - bGenModel.tier; // Ascending (lower tier value = higher priority)
            }

            // 6. Finally, alphabetical as fallback
            return aName.localeCompare(bName);
        });
    }

    extractGpuGenerationAndModel(name, manufacturer) {
        let generation = 0;
        let model = 0;
        let tier = 99; // Lower = better (Ti Super = 1, Ti = 2, Super = 3, regular = 99)

        if (manufacturer === 'NVIDIA') {
            // RTX 5090, RTX 4080 Ti Super, etc.
            const rtxMatch = name.match(/RTX\s*(\d)(\d{2,3})/i);
            if (rtxMatch) {
                generation = parseInt(rtxMatch[1]) * 1000; // 5000, 4000, 3000
                model = parseInt(rtxMatch[2]); // 90, 80, 70, 60, 50
            }

            // Check for Ti Super, Ti, Super
            if (name.includes('TI SUPER')) {
                tier = 1;
            } else if (name.includes('TI')) {
                tier = 2;
            } else if (name.includes('SUPER')) {
                tier = 3;
            }
        } else if (manufacturer === 'AMD') {
            // RX 7900 XT, RX 6800, etc.
            const rxMatch = name.match(/RX\s*(\d)(\d{2,3})/i);
            if (rxMatch) {
                generation = parseInt(rxMatch[1]) * 1000; // 7000, 6000
                model = parseInt(rxMatch[2]); // 900, 800, 700, 600
            }

            // Check for XT, XTX, GRE
            if (name.includes('XTX')) {
                tier = 1;
            } else if (name.includes('XT')) {
                tier = 2;
            } else if (name.includes('GRE')) {
                tier = 3;
            }
        } else if (manufacturer === 'INTEL') {
            // Arc A770, Arc A580, etc.
            const arcMatch = name.match(/ARC\s*A(\d{2,3})/i);
            if (arcMatch) {
                generation = 1000; // All Arc cards are gen 1
                model = parseInt(arcMatch[1]); // 770, 750, 580, 380
            }
        }

        return { generation, model, tier };
    }

    calculateDiscount(component) {
        const basePrice = parseFloat(component.basePrice) || 0;
        const salePrice = parseFloat(component.salePrice || component.currentPrice) || 0;
        const isOnSale = component.isOnSale || (salePrice > 0 && salePrice < basePrice);
        
        if (isOnSale && basePrice > 0) {
            return Math.round(((basePrice - salePrice) / basePrice) * 100);
        }
        return 0;
    }

    async selectComponentFromModal(componentType, index) {
        let component = null;

        switch (componentType) {
            case 'gpu':
                component = this.allGPUs[index];
                break;
            case 'cpu':
                component = this.allCPUs[index];
                break;
            case 'motherboard':
                component = this.allMotherboards[index];
                break;
            case 'ram':
                component = this.allRAM[index];
                break;
            case 'cooler':
                component = this.allCoolers[index];
                break;
            case 'psu':
                component = this.allPSUs[index];
                break;
        }

        if (component) {
            // Special handling for GPUs - load all variants into comparison panel
            if (componentType === 'gpu') {
                try {
                    // Fetch all variants for this GPU model
                    const variants = await this.fetchComponentVariants(component, componentType);

                    if (variants && variants.length > 0) {
                        // Initialize comparison array if it doesn't exist
                        if (!this.comparisonComponents) {
                            this.comparisonComponents = [];
                            this.currentComparisonIndex = 0;
                        }

                        // Add all variants to comparison (append, don't clear)
                        variants.forEach((variant, variantIndex) => {
                            // Check if this variant is already in the comparison
                            const variantId = variant._id || variant.title;
                            const alreadyExists = this.comparisonComponents.some(item => {
                                const existingId = item.component._id || item.component.title;
                                return existingId === variantId;
                            });

                            // Only add if not already present
                            if (!alreadyExists) {
                                this.comparisonComponents.push({
                                    component: variant,
                                    componentType: 'gpu',
                                    variantIndex: this.comparisonComponents.length
                                });
                            }
                        });

                        // Show the details panel with the first variant
                        this.currentDetailSelection = {
                            component: variants[0],
                            componentType: 'gpu',
                            variantIndex: 0
                        };

                        // Update comparison index to show the first variant of this group
                        const firstVariantId = variants[0]._id || variants[0].title;
                        const firstVariantIndex = this.comparisonComponents.findIndex(item => {
                            const itemId = item.component._id || item.component.title;
                            return itemId === firstVariantId;
                        });
                        if (firstVariantIndex !== -1) {
                            this.currentComparisonIndex = firstVariantIndex;
                        }

                        // Close statistics panel if it's open
                        this.closeStatisticsPanel();

                        // Render and show the panel
                        this.renderComparisonView();
                        const panel = document.getElementById('componentDetailsPanel');
                        panel.classList.remove('hidden');
                        // Create mobile toggle button if on mobile
                        this.createMobileDetailsToggle();

                        return; // Don't proceed to normal selection
                    }
                } catch (error) {
                    console.error('Error loading GPU variants:', error);
                    // Fall through to normal selection on error
                }
            }

            // Normal selection for non-GPU or if GPU variant loading failed
            this.selectBuilderComponent(componentType, index, component);
            this.closeComponentModal();
        }
    }

    showDetailsPanel(component, componentType, variantIndex) {
        const panel = document.getElementById('componentDetailsPanel');
        const bodyElement = document.getElementById('detailsPanelBody');

        // Remove panel-expanded class from all cards
        document.querySelectorAll('.part-card.panel-expanded').forEach(card => {
            card.classList.remove('panel-expanded');
        });

        // Initialize comparison array if it doesn't exist
        if (!this.comparisonComponents) {
            this.comparisonComponents = [];
            this.currentComparisonIndex = 0;
        }

        // Check if this component is already in the comparison list
        const existingIndex = this.comparisonComponents.findIndex(c =>
            (c.component._id || c.component.title) === (component._id || component.title)
        );

        if (existingIndex === -1) {
            // Add new component to comparison
            this.comparisonComponents.push({ component, componentType, variantIndex });
            this.currentComparisonIndex = this.comparisonComponents.length - 1;
        } else {
            // Component already exists, just switch to it
            this.currentComparisonIndex = existingIndex;
        }

        // Store current selection for the "Add to Build" button
        this.currentDetailSelection = { component, componentType, variantIndex };

        // Close statistics panel if it's open
        this.closeStatisticsPanel();

        // Find and mark the clicked card as expanded
        const componentId = component._id || component.title || component.name;
        document.querySelectorAll('.part-card').forEach(card => {
            if (card.dataset.componentId === componentId) {
                card.classList.add('panel-expanded');
            }
        });

        // Render the comparison view
        this.renderComparisonView();
        panel.classList.remove('hidden');

        // Create mobile toggle button if on mobile
        this.createMobileDetailsToggle();

        // Unround modal right corners
        const modalContent = document.querySelector('.modal-content');
        console.log('Found modal-content:', modalContent);
        if (modalContent) {
            console.log('Before:', modalContent.style.borderRadius);
            modalContent.style.setProperty('border-radius', '12px 0 0 12px', 'important');
            console.log('After:', modalContent.style.borderRadius);
            console.log('Computed style:', window.getComputedStyle(modalContent).borderRadius);
        } else {
            console.log('Modal content not found!');
        }
    }

    renderComparisonView() {
        const bodyElement = document.getElementById('detailsPanelBody');

        if (!this.comparisonComponents || this.comparisonComponents.length === 0) {
            return;
        }

        const currentItem = this.comparisonComponents[this.currentComparisonIndex];
        const component = currentItem.component;
        const componentType = currentItem.componentType;

        // Debug: Log price history data
        console.log('=== PRICE HISTORY DEBUG ===');
        console.log('Component Name:', component.title || component.name);
        console.log('Has priceHistory:', !!component.priceHistory);
        if (component.priceHistory && Array.isArray(component.priceHistory)) {
            console.log('Price History Length:', component.priceHistory.length);
            console.log('Price History Data:');
            component.priceHistory.forEach((entry, index) => {
                const date = entry.date ? new Date(entry.date).toLocaleDateString() : 'No date';
                const price = entry.price || entry.currentPrice || entry.salePrice || 'No price';
                const isAvailable = entry.isAvailable !== undefined ? entry.isAvailable : 'N/A';
                console.log(`  [${index}] Date: ${date}, Price: $${price}, Available: ${isAvailable}`);
            });
        } else {
            console.log('No price history available');
        }
        console.log('Current Price:', component.currentPrice);
        console.log('Base Price:', component.basePrice);
        console.log('Sale Price:', component.salePrice);
        console.log('===========================');

        // Build the details HTML
        const name = component.title || component.name || 'Unknown Component';
        const manufacturer = component.manufacturer || 'Unknown';
        const basePrice = parseFloat(component.basePrice) || 0;
        const salePrice = parseFloat(component.salePrice) || parseFloat(component.currentPrice) || 0;
        const currentPrice = salePrice > 0 ? salePrice : basePrice;
        const isOnSale = component.isOnSale || (salePrice > 0 && salePrice < basePrice);
        const discount = isOnSale && basePrice > 0 ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0;
        const imageUrl = component.imageUrl || component.image || '';
        const sourceUrl = component.sourceUrl || component.url || '#';

        // Determine manufacturer color
        const manufacturerLower = manufacturer.toLowerCase();
        let manufacturerColor = 'rgba(37, 99, 235, 0.95)'; // default purple
        if (manufacturerLower.includes('amd') || manufacturerLower.includes('radeon')) {
            manufacturerColor = 'rgba(220, 38, 38, 0.95)'; // red for AMD
        } else if (manufacturerLower.includes('nvidia') || manufacturerLower.includes('geforce')) {
            manufacturerColor = 'rgba(34, 197, 94, 0.95)'; // green for NVIDIA
        } else if (manufacturerLower.includes('intel') || manufacturerLower.includes('arc')) {
            manufacturerColor = 'rgba(59, 130, 246, 0.95)'; // light blue for Intel
        }

        // Get VRAM from specifications
        const specs = component.specifications || {};
        let vramSize = '';
        let memoryType = '';

        // Try to get memory size from various sources
        if (component.memorySize) {
            vramSize = component.memorySize;
        } else if (specs.memory) {
            if (typeof specs.memory === 'object') {
                vramSize = specs.memory.size || specs.memory.capacity || specs.memory.amount || '';
            } else {
                vramSize = specs.memory;
            }
        } else if (component.memory) {
            if (typeof component.memory === 'object') {
                vramSize = component.memory.size || component.memory.capacity || component.memory.amount || '';
            } else {
                vramSize = component.memory;
            }
        }

        // Try to extract VRAM from the name if not found
        if (!vramSize && componentType === 'gpu') {
            const nameMatch = name.match(/(\d+)GB/i);
            if (nameMatch) {
                vramSize = nameMatch[1];
            }
        }

        // Get memory type (GDDR6, GDDR6X, GDDR7, etc.) from various sources
        if (component.memoryType) {
            memoryType = component.memoryType;
        } else if (specs.memoryType) {
            memoryType = specs.memoryType;
        } else if (component.memory && typeof component.memory === 'object' && component.memory.type) {
            memoryType = component.memory.type;
        }

        // Build VRAM display string
        let vram = '';
        if (vramSize) {
            // Ensure vramSize has GB suffix
            const sizeStr = vramSize.toString().toUpperCase().includes('GB') ? vramSize : `${vramSize}GB`;
            if (memoryType) {
                vram = `${sizeStr} ${memoryType}`;
            } else {
                vram = sizeStr;
            }
        }

        // Check CPU compatibility with selected motherboard
        let isCpuCompatible = true;
        let incompatibilityMessage = '';
        if (componentType === 'cpu' && this.currentBuild && this.currentBuild.motherboard) {
            const selectedMotherboard = this.currentBuild.motherboard;
            const motherboardSocket = selectedMotherboard.socket || selectedMotherboard.socketType;
            const cpuSocket = component.socket || component.socketType;

            console.log('=== COMPATIBILITY CHECK ===');
            console.log('Current CPU being displayed:', component.title || component.name);
            console.log('CPU Socket:', cpuSocket);
            console.log('Motherboard Socket:', motherboardSocket);

            if (motherboardSocket && cpuSocket) {
                const normalizedCpuSocket = cpuSocket.toString().trim().toUpperCase();
                const normalizedMotherboardSocket = motherboardSocket.toString().trim().toUpperCase();
                isCpuCompatible = normalizedCpuSocket === normalizedMotherboardSocket;

                console.log('Normalized CPU Socket:', normalizedCpuSocket);
                console.log('Normalized Motherboard Socket:', normalizedMotherboardSocket);
                console.log('Is Compatible:', isCpuCompatible);

                if (!isCpuCompatible) {
                    incompatibilityMessage = `⚠️ Incompatible with selected motherboard (${motherboardSocket} socket required, this CPU has ${cpuSocket})`;
                }
            }
            console.log('===========================');
        }

        // Check RAM compatibility with selected motherboard
        let isRamCompatible = true;
        if (componentType === 'ram' && this.currentBuild && this.currentBuild.motherboard) {
            const selectedMotherboard = this.currentBuild.motherboard;
            const motherboardMemoryTypes = selectedMotherboard.memoryType || [];
            const ramMemoryType = component.memoryType;

            console.log('=== RAM COMPATIBILITY CHECK ===');
            console.log('Current RAM being displayed:', component.title || component.name);
            console.log('RAM Memory Type:', ramMemoryType);
            console.log('Motherboard Memory Types:', motherboardMemoryTypes);

            // Ensure motherboardMemoryTypes is an array
            const memoryTypesArray = Array.isArray(motherboardMemoryTypes) ? motherboardMemoryTypes : [motherboardMemoryTypes];

            if (memoryTypesArray.length > 0 && ramMemoryType) {
                const normalizedRamType = ramMemoryType.toString().trim().toUpperCase();

                // Check if RAM type matches any of the motherboard's supported types
                isRamCompatible = memoryTypesArray.some(mbType => {
                    const normalizedMbType = mbType.toString().trim().toUpperCase();
                    return normalizedRamType.includes(normalizedMbType) || normalizedMbType.includes(normalizedRamType);
                });

                console.log('Normalized RAM Type:', normalizedRamType);
                console.log('Is Compatible:', isRamCompatible);

                if (!isRamCompatible) {
                    const mbTypesStr = memoryTypesArray.join('/');
                    incompatibilityMessage = `⚠️ Incompatible with selected motherboard (${mbTypesStr} required, this RAM is ${ramMemoryType})`;
                }
            }
            console.log('===========================');
        }

        // Check motherboard compatibility with selected CPU and RAM
        let isMotherboardCompatible = true;
        let motherboardIncompatibilityMessages = [];
        if (componentType === 'motherboard' && this.currentBuild) {
            console.log('=== MOTHERBOARD COMPATIBILITY CHECK ===');
            console.log('Current Motherboard being displayed:', component.title || component.name);

            // Check CPU socket compatibility
            if (this.currentBuild.cpu) {
                const selectedCpu = this.currentBuild.cpu;
                const motherboardSocket = component.socket || component.socketType;
                const cpuSocket = selectedCpu.socket || selectedCpu.socketType;

                console.log('CPU Socket:', cpuSocket);
                console.log('Motherboard Socket:', motherboardSocket);

                if (motherboardSocket && cpuSocket) {
                    const normalizedCpuSocket = cpuSocket.toString().trim().toUpperCase();
                    const normalizedMotherboardSocket = motherboardSocket.toString().trim().toUpperCase();
                    const cpuCompatible = normalizedCpuSocket === normalizedMotherboardSocket;

                    console.log('CPU Socket Compatible:', cpuCompatible);

                    if (!cpuCompatible) {
                        isMotherboardCompatible = false;
                        motherboardIncompatibilityMessages.push(`CPU Socket Mismatch: ${motherboardSocket} (CPU has ${cpuSocket})`);
                    }
                }
            }

            // Check RAM memory type compatibility
            if (this.currentBuild.ram) {
                const selectedRam = this.currentBuild.ram;
                const motherboardMemoryTypes = component.memoryType || [];
                const ramMemoryType = selectedRam.memoryType;

                console.log('RAM Memory Type:', ramMemoryType);
                console.log('Motherboard Memory Types:', motherboardMemoryTypes);

                const memoryTypesArray = Array.isArray(motherboardMemoryTypes) ? motherboardMemoryTypes : [motherboardMemoryTypes];

                if (memoryTypesArray.length > 0 && ramMemoryType) {
                    const normalizedRamType = ramMemoryType.toString().trim().toUpperCase();

                    const ramCompatible = memoryTypesArray.some(mbType => {
                        const normalizedMbType = mbType.toString().trim().toUpperCase();
                        return normalizedRamType.includes(normalizedMbType) || normalizedMbType.includes(normalizedRamType);
                    });

                    console.log('RAM Type Compatible:', ramCompatible);

                    if (!ramCompatible) {
                        isMotherboardCompatible = false;
                        const mbTypesStr = memoryTypesArray.join('/');
                        motherboardIncompatibilityMessages.push(`RAM Type Mismatch: ${mbTypesStr} (RAM is ${ramMemoryType})`);
                    }
                }
            }

            // Check case/motherboard form factor compatibility
            if (this.currentBuild.case) {
                const selectedCase = this.currentBuild.case;
                const caseFormFactors = selectedCase.formFactor || [];
                const caseFormFactorArray = Array.isArray(caseFormFactors) ? caseFormFactors : [caseFormFactors];
                const motherboardFormFactor = component.formFactor || '';

                console.log('Case Form Factors:', caseFormFactorArray);
                console.log('Motherboard Form Factor:', motherboardFormFactor);

                if (motherboardFormFactor && caseFormFactorArray.length > 0) {
                    let caseCompatible = false;

                    // Normalize motherboard form factor (handle all variants - remove hyphens and normalize spaces)
                    const moboFFUpper = motherboardFormFactor.toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();

                    // Check motherboard type (order matters: check more specific first)
                    const isMoboITX = moboFFUpper.includes('ITX') && !moboFFUpper.includes('ATX');
                    const isMoboMicroATX = moboFFUpper.includes('MATX') || moboFFUpper.includes('MICROATX');
                    const isMoboEATX = moboFFUpper.includes('EATX');
                    const isMoboATX = !isMoboITX && !isMoboMicroATX && !isMoboEATX && moboFFUpper.includes('ATX');

                    for (const caseFF of caseFormFactorArray) {
                        const caseFFUpper = caseFF.toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();

                        // Check case type (order matters: check more specific first)
                        const isCaseITX = caseFFUpper.includes('ITX') && !caseFFUpper.includes('ATX');
                        const isCaseMicroATX = caseFFUpper.includes('MATX') || caseFFUpper.includes('MICROATX');
                        const isCaseEATX = caseFFUpper.includes('EATX');
                        const isCaseATX = !isCaseITX && !isCaseMicroATX && !isCaseEATX && caseFFUpper.includes('ATX');

                        // E-ATX case accepts all motherboards
                        if (isCaseEATX) {
                            caseCompatible = true;
                            break;
                        }
                        // ATX case: compatible with ATX, mATX, ITX
                        else if (isCaseATX && (isMoboATX || isMoboMicroATX || isMoboITX)) {
                            caseCompatible = true;
                            break;
                        }
                        // mATX/Micro ATX case: compatible with mATX, ITX
                        else if (isCaseMicroATX && (isMoboMicroATX || isMoboITX)) {
                            caseCompatible = true;
                            break;
                        }
                        // ITX case: compatible with ITX only
                        else if (isCaseITX && isMoboITX) {
                            caseCompatible = true;
                            break;
                        }
                    }

                    console.log('Case Compatible:', caseCompatible);

                    if (!caseCompatible) {
                        isMotherboardCompatible = false;
                        const caseFFDisplay = caseFormFactorArray.join('/');
                        motherboardIncompatibilityMessages.push(`Too Large for Case: ${motherboardFormFactor} won't fit in ${caseFFDisplay} case`);
                    }
                }
            }

            // Set incompatibility message for motherboard
            if (motherboardIncompatibilityMessages.length > 0) {
                incompatibilityMessage = `⚠️ ${motherboardIncompatibilityMessages.join(' | ')}`;
            }

            console.log('Motherboard Is Compatible:', isMotherboardCompatible);
            console.log('===========================');
        }

        // Set overall compatibility flag
        const isCompatible = (componentType === 'cpu' ? isCpuCompatible : (componentType === 'ram' ? isRamCompatible : (componentType === 'motherboard' ? isMotherboardCompatible : true)));

        // Cycling controls
        const showCyclingControls = this.comparisonComponents.length > 1;
        const componentTypeLabel = componentType === 'gpu' ? 'GPUs' : componentType === 'cpu' ? 'CPUs' : 'Components';
        const cyclingControlsHTML = showCyclingControls ? `
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 12px; gap: 10px;">
                <button onclick="pcBuilder.cycleComparison(-1)" class="cycle-btn" title="Previous ${componentTypeLabel}">
                    <i class="fas fa-chevron-left"></i>
                </button>
                <div class="comparison-counter" style="text-align: center; flex: 1; font-size: 12px; color: #888;">
                    ${this.currentComparisonIndex + 1} of ${this.comparisonComponents.length} ${componentTypeLabel}
                </div>
                <button onclick="pcBuilder.cycleComparison(1)" class="cycle-btn" title="Next ${componentTypeLabel}">
                    <i class="fas fa-chevron-right"></i>
                </button>
                <button onclick="pcBuilder.removeFromComparison()" class="remove-comparison-btn" title="Remove from comparison">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        ` : '';

        let detailsHTML = `
            ${cyclingControlsHTML}

            <div class="image-title-box ${!isCompatible ? 'incompatible-component' : ''}">
                <div class="title-box-text">${name}</div>
            </div>
            <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer" class="detail-product-link ${!isCompatible ? 'incompatible-component' : ''}">
                <div class="detail-image-container ${!isCompatible ? 'incompatible-component' : ''}">
                    ${imageUrl ? `
                        <img src="${imageUrl}" alt="${name}" class="detail-image" data-tooltip-text="${name}" onerror="this.parentElement.innerHTML='<div class=\\'detail-image-placeholder\\'><i class=\\'fas fa-microchip\\' style=\\'font-size: 48px; color: #ccc;\\'></i></div>'">
                    ` : `
                        <div class="detail-image-placeholder" style="display: flex; align-items: center; justify-content: center; height: 200px; background: #f8f9fa; border-radius: 8px;">
                            <i class="fas fa-microchip" style="font-size: 64px; color: #ccc;"></i>
                        </div>
                    `}
                    <div class="image-manufacturer-badge" style="background: linear-gradient(135deg, ${manufacturerColor} 0%, ${manufacturerColor.replace('0.95', '0.85')} 100%);">${manufacturer}</div>
                    ${!isCompatible ? `
                        <div class="image-incompatibility-overlay">
                            <div class="incompatibility-warning-badge">
                                ${incompatibilityMessage}
                            </div>
                        </div>
                    ` : ''}
                    ${vram ? `
                        <div class="image-vram-overlay">
                            <div class="overlay-vram-text">${vram}</div>
                        </div>
                    ` : ''}
                    ${isOnSale ? `
                        <div class="image-price-overlay">
                            <div class="overlay-sale-price">$${salePrice.toFixed(2)}</div>
                            <div class="overlay-original-price">$${basePrice.toFixed(2)}</div>
                            <div class="overlay-discount" style="background: ${this.getDiscountColor(discount)}">${discount}% OFF</div>
                        </div>
                    ` : `
                        <div class="image-price-overlay">
                            <div class="overlay-current-price">$${currentPrice.toFixed(2)}</div>
                        </div>
                    `}
                </div>
            </a>

            <button class="select-component-btn ${!isCompatible ? 'incompatible-button' : ''}" onclick="pcBuilder.addToBuildFromDetails()" style="width: 100%; margin: 8px 0;">
                <i class="fas ${!isCompatible ? 'fa-exclamation-triangle' : 'fa-check'}"></i> ${this.modalContext === 'cpu-tab' ? 'Select This CPU' : 'Add to Build'}
            </button>

            ${this.createComparisonGraph()}
        `;

        bodyElement.innerHTML = detailsHTML;

        // Initialize custom tooltip for images
        this.initializeImageTooltip();

        // Initialize hover functionality for comparison legend items
        this.initializeComparisonLegendHover();

        // Unround modal right corners (do this AFTER all HTML is rendered)
        const modalContent = document.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.setProperty('border-radius', '12px 0 0 12px', 'important');
            console.log('renderComparisonView - Set border-radius to:', modalContent.style.borderRadius);
            console.log('Computed after setProperty:', window.getComputedStyle(modalContent).borderRadius);
        }
    }

    initializeImageTooltip() {
        // Create tooltip element if it doesn't exist
        let tooltip = document.querySelector('.custom-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.className = 'custom-tooltip';
            document.body.appendChild(tooltip);
        }

        // Get all images with data-tooltip-text
        const images = document.querySelectorAll('img[data-tooltip-text]');

        images.forEach(img => {
            img.addEventListener('mouseenter', (e) => {
                const text = e.target.getAttribute('data-tooltip-text');
                if (text) {
                    tooltip.textContent = text;
                    tooltip.classList.add('show');
                }
            });

            img.addEventListener('mousemove', (e) => {
                // Position tooltip to the left of the cursor
                const tooltipWidth = tooltip.offsetWidth;
                const tooltipHeight = tooltip.offsetHeight;

                // Position to the left of the cursor with some offset
                let left = e.clientX - tooltipWidth - 15; // 15px offset from cursor
                let top = e.clientY - (tooltipHeight / 2); // Center vertically with cursor

                // Keep tooltip on screen - if it would go off the left edge, show on right
                if (left < 10) {
                    left = e.clientX + 15; // Show on right side instead
                }

                // Keep tooltip from going off top or bottom
                if (top < 10) top = 10;
                if (top + tooltipHeight > window.innerHeight - 10) {
                    top = window.innerHeight - tooltipHeight - 10;
                }

                tooltip.style.left = left + 'px';
                tooltip.style.top = top + 'px';
            });

            img.addEventListener('mouseleave', () => {
                tooltip.classList.remove('show');
            });
        });
    }

    initializeComparisonLegendHover() {
        // Get all legend items
        const legendItems = document.querySelectorAll('.comparison-legend-item');

        legendItems.forEach(item => {
            item.addEventListener('mouseenter', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-comparison-index'));
                if (!isNaN(index) && index >= 0 && index < this.comparisonComponents.length && index !== this.currentComparisonIndex) {
                    // Update current comparison index
                    this.currentComparisonIndex = index;

                    // Update the current detail selection
                    const currentItem = this.comparisonComponents[this.currentComparisonIndex];
                    this.currentDetailSelection = currentItem;

                    // Just redraw the canvas and update specific elements (same as graph hover)
                    this.redrawComparisonChart();
                    this.updateComparisonDetails();
                }
            });

            // Add hover style
            item.addEventListener('mouseenter', (e) => {
                if (e.currentTarget.style.background === 'transparent') {
                    e.currentTarget.style.background = 'rgba(37, 99, 235, 0.05)';
                }
            });

            item.addEventListener('mouseleave', (e) => {
                const index = parseInt(e.currentTarget.getAttribute('data-comparison-index'));
                const isCurrent = index === this.currentComparisonIndex;
                if (!isCurrent) {
                    e.currentTarget.style.background = 'transparent';
                }
            });
        });

        // Add click handlers for remove buttons
        const removeButtons = document.querySelectorAll('.remove-comparison-item-btn');
        removeButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent triggering the legend item hover
                const index = parseInt(e.currentTarget.getAttribute('data-remove-index'));
                if (!isNaN(index) && index >= 0 && index < this.comparisonComponents.length) {
                    this.removeFromComparisonByIndex(index);
                }
            });

            // Add hover effect for remove button
            btn.addEventListener('mouseenter', (e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)';
                e.currentTarget.style.transform = 'scale(1.1)';
            });

            btn.addEventListener('mouseleave', (e) => {
                e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)';
                e.currentTarget.style.transform = 'scale(1)';
            });
        });
    }

    cycleComparison(direction) {
        if (!this.comparisonComponents || this.comparisonComponents.length <= 1) return;

        this.currentComparisonIndex += direction;

        // Wrap around
        if (this.currentComparisonIndex < 0) {
            this.currentComparisonIndex = this.comparisonComponents.length - 1;
        } else if (this.currentComparisonIndex >= this.comparisonComponents.length) {
            this.currentComparisonIndex = 0;
        }

        // Update the current detail selection for "Add to Build" button
        const currentItem = this.comparisonComponents[this.currentComparisonIndex];
        this.currentDetailSelection = currentItem;

        this.renderComparisonView();
    }

    removeFromComparison() {
        if (!this.comparisonComponents || this.comparisonComponents.length === 0) return;

        // Get the component being removed to update its variant card or component row
        const removedItem = this.comparisonComponents[this.currentComparisonIndex];
        const removedId = removedItem.component._id || removedItem.component.title;

        // Remove current item
        this.comparisonComponents.splice(this.currentComparisonIndex, 1);

        // Update the variant card styling (for GPU variants)
        const variantCard = document.querySelector(`.variant-card[data-variant-id="${removedId}"]`);
        if (variantCard) {
            variantCard.classList.remove('variant-selected');
            const indicator = variantCard.querySelector('.selection-indicator');
            if (indicator) indicator.remove();
        }

        // Update the component row styling (for CPUs and other non-variant components)
        const componentRow = document.querySelector(`tr.component-main-row[data-component-id="${removedId}"]`);
        if (componentRow) {
            componentRow.classList.remove('component-selected');
            componentRow.style.backgroundColor = '';
            componentRow.style.borderLeft = '';
            const indicator = componentRow.querySelector('.selection-indicator');
            if (indicator) indicator.remove();
        }

        if (this.comparisonComponents.length === 0) {
            // No more items, close the panel
            this.closeDetailsPanel();
            return;
        }

        // Adjust index if needed
        if (this.currentComparisonIndex >= this.comparisonComponents.length) {
            this.currentComparisonIndex = this.comparisonComponents.length - 1;
        }

        // Update the current detail selection
        const currentItem = this.comparisonComponents[this.currentComparisonIndex];
        this.currentDetailSelection = currentItem;

        this.renderComparisonView();
    }

    removeFromComparisonByIndex(index) {
        if (!this.comparisonComponents || this.comparisonComponents.length === 0) return;
        if (index < 0 || index >= this.comparisonComponents.length) return;

        // Get the component being removed to update its variant card or component row
        const removedItem = this.comparisonComponents[index];
        const removedId = removedItem.component._id || removedItem.component.title;

        // Remove the item at the specified index
        this.comparisonComponents.splice(index, 1);

        // Update the variant card styling (for GPU variants)
        const variantCard = document.querySelector(`.variant-card[data-variant-id="${removedId}"]`);
        if (variantCard) {
            variantCard.classList.remove('variant-selected');
            const indicator = variantCard.querySelector('.selection-indicator');
            if (indicator) indicator.remove();
        }

        // Update the component row styling (for CPUs and other non-variant components)
        const componentRow = document.querySelector(`tr.component-main-row[data-component-id="${removedId}"]`);
        if (componentRow) {
            componentRow.classList.remove('component-selected');
            componentRow.style.backgroundColor = '';
            componentRow.style.borderLeft = '';
            const indicator = componentRow.querySelector('.selection-indicator');
            if (indicator) indicator.remove();
        }

        if (this.comparisonComponents.length === 0) {
            // No more items, close the panel
            this.closeDetailsPanel();
            return;
        }

        // Adjust current index if the removed item was before or at the current index
        if (index <= this.currentComparisonIndex) {
            this.currentComparisonIndex = Math.max(0, this.currentComparisonIndex - 1);
        }

        // Make sure current index is within bounds
        if (this.currentComparisonIndex >= this.comparisonComponents.length) {
            this.currentComparisonIndex = this.comparisonComponents.length - 1;
        }

        // Update the current detail selection
        const currentItem = this.comparisonComponents[this.currentComparisonIndex];
        this.currentDetailSelection = currentItem;

        this.renderComparisonView();
    }

    createComparisonGraph() {
        const graphId = 'comparisonGraph_' + Date.now();

        // Collect all components' price histories
        const allHistories = this.comparisonComponents.map((item, index) => {
            const component = item.component;
            const basePrice = parseFloat(component.basePrice) || 0;
            const salePrice = parseFloat(component.salePrice) || parseFloat(component.currentPrice) || 0;
            const name = (component.title || component.name || 'Unknown').substring(0, 30);

            return {
                name: name,
                history: this.generatePriceHistory(basePrice, salePrice, component.priceHistory),
                color: this.getComparisonColor(index)
            };
        });

        // Store for later redrawing
        this.currentGraphId = graphId;
        this.currentAllHistories = allHistories;

        setTimeout(() => {
            this.drawComparisonChart(graphId, allHistories);
        }, 100);

        // Create legend with performance scores
        const legendHTML = allHistories.map((item, index) => {
            const isCurrent = index === this.currentComparisonIndex;
            const componentItem = this.comparisonComponents[index];
            const component = componentItem?.component;

            // Get performance score based on component type
            let performanceScore = null;
            if (componentItem?.componentType === 'gpu' && component) {
                performanceScore = this.getGpuPerformance(component);
            } else if (componentItem?.componentType === 'cpu' && component) {
                performanceScore = this.getCpuPerformance(component);
            }

            // Get price
            const basePrice = parseFloat(component?.basePrice) || 0;
            const salePrice = parseFloat(component?.salePrice || component?.currentPrice) || 0;
            const displayPrice = salePrice > 0 ? salePrice : basePrice;

            return `
                <div class="comparison-legend-item" data-comparison-index="${index}" style="display: flex; align-items: center; gap: 8px; padding: 4px 8px; background: ${isCurrent ? 'rgba(37, 99, 235, 0.1)' : 'transparent'}; border-radius: 4px; cursor: pointer; transition: background 0.2s;">
                    <div style="width: 12px; height: 12px; background: ${item.color}; border-radius: 2px; flex-shrink: 0;"></div>
                    <div style="font-size: 11px; color: ${isCurrent ? '#2563eb' : '#666'}; font-weight: ${isCurrent ? '600' : '400'}; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name}</div>
                    <div style="font-size: 11px; color: #16a34a; font-weight: 600; background: rgba(34, 197, 94, 0.1); padding: 2px 6px; border-radius: 4px; flex-shrink: 0;">$${displayPrice.toFixed(2)}</div>
                    ${performanceScore !== null ? `
                        <div style="font-size: 11px; color: #2563eb; font-weight: 600; background: rgba(37, 99, 235, 0.1); padding: 2px 6px; border-radius: 4px; flex-shrink: 0;">${(performanceScore * 100).toFixed(1)}%</div>
                    ` : ''}
                    <div class="remove-comparison-item-btn" data-remove-index="${index}" style="width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; background: rgba(239, 68, 68, 0.1); color: #ef4444; border-radius: 3px; font-size: 10px; font-weight: 700; cursor: pointer; flex-shrink: 0; transition: all 0.2s;" title="Remove from comparison">×</div>
                </div>
            `;
        }).join('');

        return `
            <div class="savings-graph-section">
                <h4 style="font-size: 14px; font-weight: 600; color: #2563eb; margin: 0 0 12px 0; text-transform: uppercase; letter-spacing: 0.5px;">
                    Price Comparison (Last 30 Days)
                </h4>

                ${this.comparisonComponents.length > 1 ? `
                    <div style="display: flex; flex-direction: column; gap: 4px; margin-bottom: 12px; padding: 8px; background: #f8f9fa; border-radius: 6px;">
                        ${legendHTML}
                    </div>
                ` : ''}

                <canvas id="${graphId}" width="360" height="240" style="width: 100%; max-width: 360px;"></canvas>
            </div>
        `;
    }

    getComparisonColor(index) {
        const colors = [
            '#2563eb', // Blue (primary)
            '#ff6b6b', // Red
            '#4ecdc4', // Teal
            '#ffd93d', // Yellow
            '#95e1d3', // Mint
            '#f38181', // Pink
            '#a8e6cf', // Light green
            '#ff9a76'  // Orange
        ];
        return colors[index % colors.length];
    }

    drawComparisonChart(canvasId, allHistories) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Chart dimensions
        const padding = { top: 20, right: 20, bottom: 40, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Find global min and max prices across all histories
        let allPrices = [];
        allHistories.forEach(item => {
            allPrices = allPrices.concat(item.history.map(d => d.price));
        });

        const minPrice = 0; // Always start Y-axis at 0
        const maxPrice = Math.max(...allPrices) * 1.05;
        const priceRange = maxPrice - minPrice;

        // Find max history length for X-axis
        const maxLength = Math.max(...allHistories.map(item => item.history.length));

        // Helper functions
        const xScale = (index, historyLength) => {
            // Handle single data point case - place it in the middle
            if (historyLength === 1) {
                return padding.left + chartWidth / 2;
            }
            return padding.left + (index / (historyLength - 1)) * chartWidth;
        };
        const yScale = (price) => padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;

        // Add hover interactivity for line selection
        canvas.style.cursor = 'pointer';

        // Tooltip state - store on canvas for persistence
        if (!canvas._tooltipState) {
            canvas._tooltipState = {
                timer: null,
                currentKey: null,
                pointData: null,
                mousePos: null
            };
        }

        // Remove existing listeners to prevent duplicates
        if (canvas._comparisonMouseMove) {
            canvas.removeEventListener('mousemove', canvas._comparisonMouseMove);
        }
        if (canvas._comparisonMouseLeave) {
            canvas.removeEventListener('mouseleave', canvas._comparisonMouseLeave);
        }

        const mouseMoveHandler = (e) => {
            const rect = canvas.getBoundingClientRect();
            const scaleX = canvas.width / rect.width;
            const scaleY = canvas.height / rect.height;
            const mouseX = (e.clientX - rect.left) * scaleX;
            const mouseY = (e.clientY - rect.top) * scaleY;

            // Find closest point to mouse for tooltip
            let closestPoint = null;
            let closestPointDistance = Infinity;
            const pointHoverThreshold = 15; // pixels for point detection

            allHistories.forEach((item, gpuIndex) => {
                const priceHistory = item.history;
                const componentData = this.comparisonComponents[gpuIndex];

                priceHistory.forEach((point, pointIndex) => {
                    const x = xScale(pointIndex, priceHistory.length);
                    const y = yScale(point.price);
                    const distance = Math.sqrt(Math.pow(mouseX - x, 2) + Math.pow(mouseY - y, 2));

                    if (distance < pointHoverThreshold && distance < closestPointDistance) {
                        closestPointDistance = distance;
                        closestPoint = {
                            x, y,
                            gpuIndex,
                            pointIndex,
                            component: componentData.component,
                            price: point.price,
                            date: point.date
                        };
                    }
                });
            });

            // Handle tooltip for point hover
            if (closestPoint) {
                const tooltipKey = `${closestPoint.gpuIndex}-${closestPoint.pointIndex}`;

                // If hovering over a new point, reset timer
                if (canvas._tooltipState.currentKey !== tooltipKey) {
                    clearTimeout(canvas._tooltipState.timer);
                    canvas._tooltipState.currentKey = tooltipKey;
                    canvas._tooltipState.pointData = null; // Clear until timer completes

                    canvas._tooltipState.timer = setTimeout(() => {
                        canvas._tooltipState.pointData = closestPoint;
                        this.showGraphTooltip(closestPoint, e.clientX, e.clientY);
                    }, 333); // 1/3 second
                }
            } else {
                // Not hovering over any point, clear tooltip
                if (canvas._tooltipState.timer) {
                    clearTimeout(canvas._tooltipState.timer);
                    canvas._tooltipState.timer = null;
                }
                if (canvas._tooltipState.pointData) {
                    canvas._tooltipState.currentKey = null;
                    canvas._tooltipState.pointData = null;
                    canvas._tooltipState.mousePos = null;
                    this.hideGraphTooltip();
                }
            }

            // Find closest line to mouse for selection
            let closestGpuIndex = -1;
            let minDistance = Infinity;
            const hoverThreshold = 20; // pixels

            allHistories.forEach((item, gpuIndex) => {
                const priceHistory = item.history;

                // Check distance to line segments (between consecutive points)
                for (let i = 0; i < priceHistory.length - 1; i++) {
                    const x1 = xScale(i, priceHistory.length);
                    const y1 = yScale(priceHistory[i].price);
                    const x2 = xScale(i + 1, priceHistory.length);
                    const y2 = yScale(priceHistory[i + 1].price);

                    // Calculate distance from point to line segment
                    const distance = this.distanceToLineSegment(mouseX, mouseY, x1, y1, x2, y2);

                    if (distance < minDistance) {
                        minDistance = distance;
                        closestGpuIndex = gpuIndex;
                    }
                }
            });

            // If hovering near a line and it's different from current selection
            if (minDistance < hoverThreshold && closestGpuIndex !== -1 && closestGpuIndex !== this.currentComparisonIndex) {
                this.currentComparisonIndex = closestGpuIndex;
                const currentItem = this.comparisonComponents[this.currentComparisonIndex];
                this.currentDetailSelection = currentItem;

                // Just redraw the canvas and update specific elements
                this.redrawComparisonChart();
                this.updateComparisonDetails();
            }
        };

        const mouseLeaveHandler = () => {
            if (canvas._tooltipState.timer) {
                clearTimeout(canvas._tooltipState.timer);
                canvas._tooltipState.timer = null;
            }
            if (canvas._tooltipState.pointData) {
                canvas._tooltipState.currentKey = null;
                canvas._tooltipState.pointData = null;
                canvas._tooltipState.mousePos = null;
                this.hideGraphTooltip();
            }
        };

        canvas._comparisonMouseMove = mouseMoveHandler;
        canvas._comparisonMouseLeave = mouseLeaveHandler;
        canvas.addEventListener('mousemove', mouseMoveHandler);
        canvas.addEventListener('mouseleave', mouseLeaveHandler);

        // Draw Y-axis
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, padding.top + chartHeight);
        ctx.stroke();

        // Draw X-axis
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + chartHeight);
        ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        ctx.stroke();

        // Draw price lines for each GPU
        allHistories.forEach((item, gpuIndex) => {
            const priceHistory = item.history;
            const color = item.color;
            const isCurrent = gpuIndex === this.currentComparisonIndex;
            const lineWidth = isCurrent ? 3 : 2;
            const alpha = isCurrent ? 1 : 0.6;

            // Draw the line
            ctx.strokeStyle = color;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();

            priceHistory.forEach((point, i) => {
                const x = xScale(i, priceHistory.length);
                const y = yScale(point.price);

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.stroke();
            ctx.globalAlpha = 1;

            // Draw points (only for real data, not padded/estimated points)
            priceHistory.forEach((point, i) => {
                // Skip padded data points
                if (point.isPadded) return;

                const x = xScale(i, priceHistory.length);
                const y = yScale(point.price);

                ctx.fillStyle = color;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(x, y, isCurrent ? 4 : 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            });
        });

        // Draw Y-axis labels
        ctx.fillStyle = '#666';
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const price = minPrice + (priceRange * i / 4);
            const y = yScale(price);
            ctx.fillText(`$${price.toFixed(0)}`, padding.left - 10, y + 4);
        }

        // Draw X-axis labels (dates)
        ctx.textAlign = 'center';
        const longestHistory = allHistories.reduce((longest, item) =>
            item.history.length > longest.length ? item.history : longest,
            allHistories[0].history
        );

        if (longestHistory && longestHistory.length > 0) {
            // Start date
            const startDate = longestHistory[0].date;
            ctx.fillText(startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        padding.left, height - 15);

            // End date
            const endDate = longestHistory[longestHistory.length - 1].date;
            ctx.fillText(endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        padding.left + chartWidth, height - 15);

            // Middle date
            const midDate = longestHistory[Math.floor(longestHistory.length / 2)].date;
            ctx.fillText(midDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        padding.left + chartWidth / 2, height - 15);
        }
    }

    // Show HTML tooltip (not drawn on canvas, so it can extend beyond canvas bounds)
    showGraphTooltip(pointData, clientX, clientY) {
        // Remove existing tooltip if any
        let tooltip = document.getElementById('graph-tooltip');
        if (!tooltip) {
            tooltip = document.createElement('div');
            tooltip.id = 'graph-tooltip';
            tooltip.style.cssText = `
                position: fixed;
                background: rgba(0, 0, 0, 0.9);
                color: white;
                padding: 10px 15px;
                border-radius: 6px;
                border: 2px solid #2563eb;
                font-size: 11px;
                font-family: Arial, sans-serif;
                z-index: 10000;
                pointer-events: none;
                white-space: nowrap;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            `;
            document.body.appendChild(tooltip);
        }

        const component = pointData.component;
        const fullName = component.title || component.name || 'Unknown Component';
        const price = `$${pointData.price.toFixed(2)}`;
        const date = pointData.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });

        tooltip.textContent = `${fullName} : ${price} : ${date}`;

        // Position tooltip near mouse
        let tooltipX = clientX + 15;
        let tooltipY = clientY - 40;

        // Keep tooltip within viewport bounds
        const rect = tooltip.getBoundingClientRect();
        if (tooltipX + rect.width > window.innerWidth) {
            tooltipX = clientX - rect.width - 15;
        }
        if (tooltipY < 0) {
            tooltipY = clientY + 20;
        }

        tooltip.style.left = tooltipX + 'px';
        tooltip.style.top = tooltipY + 'px';
        tooltip.style.display = 'block';
    }

    // Hide HTML tooltip
    hideGraphTooltip() {
        const tooltip = document.getElementById('graph-tooltip');
        if (tooltip) {
            tooltip.style.display = 'none';
        }
    }

    // Helper function to calculate distance from point to line segment
    distanceToLineSegment(px, py, x1, y1, x2, y2) {
        const dx = x2 - x1;
        const dy = y2 - y1;
        const lengthSquared = dx * dx + dy * dy;

        if (lengthSquared === 0) {
            // Line segment is actually a point
            return Math.sqrt((px - x1) * (px - x1) + (py - y1) * (py - y1));
        }

        // Calculate projection of point onto line segment (clamped to 0-1)
        let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
        t = Math.max(0, Math.min(1, t));

        // Find closest point on segment
        const closestX = x1 + t * dx;
        const closestY = y1 + t * dy;

        // Return distance to closest point
        return Math.sqrt((px - closestX) * (px - closestX) + (py - closestY) * (py - closestY));
    }

    // Redraw the comparison chart without recreating the DOM
    redrawComparisonChart() {
        if (!this.currentGraphId || !this.currentAllHistories) return;

        const canvas = document.getElementById(this.currentGraphId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;
        const allHistories = this.currentAllHistories;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Chart dimensions
        const padding = { top: 20, right: 20, bottom: 40, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Find global min and max prices across all histories
        let allPrices = [];
        allHistories.forEach(item => {
            allPrices = allPrices.concat(item.history.map(d => d.price));
        });

        const minPrice = 0; // Always start Y-axis at 0
        const maxPrice = Math.max(...allPrices) * 1.05;
        const priceRange = maxPrice - minPrice;

        // Helper functions
        const xScale = (index, historyLength) => padding.left + (index / (historyLength - 1)) * chartWidth;
        const yScale = (price) => padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;

        // Draw Y-axis
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, padding.top + chartHeight);
        ctx.stroke();

        // Draw X-axis
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + chartHeight);
        ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        ctx.stroke();

        // Draw price lines for each GPU
        allHistories.forEach((item, gpuIndex) => {
            const priceHistory = item.history;
            const color = item.color;
            const isCurrent = gpuIndex === this.currentComparisonIndex;
            const lineWidth = isCurrent ? 3 : 2;
            const alpha = isCurrent ? 1 : 0.6;

            // Draw the line
            ctx.strokeStyle = color;
            ctx.globalAlpha = alpha;
            ctx.lineWidth = lineWidth;
            ctx.beginPath();

            priceHistory.forEach((point, i) => {
                const x = xScale(i, priceHistory.length);
                const y = yScale(point.price);

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });

            ctx.stroke();
            ctx.globalAlpha = 1;

            // Draw points (only for real data, not padded/estimated points)
            priceHistory.forEach((point, i) => {
                // Skip padded data points
                if (point.isPadded) return;

                const x = xScale(i, priceHistory.length);
                const y = yScale(point.price);

                ctx.fillStyle = color;
                ctx.globalAlpha = alpha;
                ctx.beginPath();
                ctx.arc(x, y, isCurrent ? 4 : 3, 0, Math.PI * 2);
                ctx.fill();
                ctx.globalAlpha = 1;
            });
        });

        // Draw Y-axis labels
        ctx.fillStyle = '#666';
        ctx.font = '11px Arial';
        ctx.textAlign = 'right';
        for (let i = 0; i <= 4; i++) {
            const price = minPrice + (priceRange * i / 4);
            const y = yScale(price);
            ctx.fillText(`$${price.toFixed(0)}`, padding.left - 10, y + 4);
        }

        // Draw X-axis labels (dates)
        ctx.textAlign = 'center';
        const longestHistory = allHistories.reduce((longest, item) =>
            item.history.length > longest.length ? item.history : longest,
            allHistories[0].history
        );

        if (longestHistory && longestHistory.length > 0) {
            const startDate = longestHistory[0].date;
            ctx.fillText(startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        padding.left, height - 15);

            const endDate = longestHistory[longestHistory.length - 1].date;
            ctx.fillText(endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        padding.left + chartWidth, height - 15);

            const midDate = longestHistory[Math.floor(longestHistory.length / 2)].date;
            ctx.fillText(midDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        padding.left + chartWidth / 2, height - 15);
        }
    }

    // Update comparison details without recreating the entire panel
    updateComparisonDetails() {
        if (!this.currentDetailSelection || !this.comparisonComponents) return;

        const component = this.currentDetailSelection.component;
        const componentType = this.currentDetailSelection.componentType;

        // Calculate prices
        const basePrice = parseFloat(component.basePrice) || 0;
        const salePrice = parseFloat(component.salePrice || component.currentPrice) || 0;
        const currentPrice = salePrice > 0 ? salePrice : basePrice;
        const isOnSale = component.isOnSale || (salePrice > 0 && salePrice < basePrice);
        const discount = isOnSale && basePrice > 0 ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0;

        // Scope all queries to the details panel only
        const detailsPanel = document.getElementById('componentDetailsPanel');
        if (!detailsPanel) return;

        // Update the product link href to match the current component
        const productLink = detailsPanel.querySelector('.detail-product-link');
        if (productLink) {
            const sourceUrl = component.sourceUrl || component.url || '#';
            productLink.href = sourceUrl;
        }

        // Update the image and basic info
        const imageContainer = detailsPanel.querySelector('.detail-image-container');
        if (imageContainer && component.imageUrl) {
            const img = imageContainer.querySelector('img');
            if (img) {
                img.src = component.imageUrl;
                img.alt = component.title || component.name || 'Component Image';
                img.setAttribute('data-tooltip-text', component.title || component.name || 'Component');
            }
        }

        // Update the price overlay
        const priceOverlay = detailsPanel.querySelector('.image-price-overlay');
        if (priceOverlay) {
            if (isOnSale) {
                priceOverlay.innerHTML = `
                    <div class="overlay-sale-price">$${salePrice.toFixed(2)}</div>
                    <div class="overlay-original-price">$${basePrice.toFixed(2)}</div>
                    <div class="overlay-discount" style="background: ${this.getDiscountColor(discount)}">${discount}% OFF</div>
                `;
            } else {
                priceOverlay.innerHTML = `
                    <div class="overlay-current-price">$${currentPrice.toFixed(2)}</div>
                `;
            }
        }

        // Update the manufacturer badge
        const manufacturer = component.manufacturer || 'Unknown';
        const manufacturerLower = manufacturer.toLowerCase();
        let manufacturerColor = 'rgba(37, 99, 235, 0.95)'; // default purple
        if (manufacturerLower.includes('amd') || manufacturerLower.includes('radeon')) {
            manufacturerColor = 'rgba(220, 38, 38, 0.95)'; // red for AMD
        } else if (manufacturerLower.includes('nvidia') || manufacturerLower.includes('geforce')) {
            manufacturerColor = 'rgba(34, 197, 94, 0.95)'; // green for NVIDIA
        } else if (manufacturerLower.includes('intel') || manufacturerLower.includes('arc')) {
            manufacturerColor = 'rgba(59, 130, 246, 0.95)'; // light blue for Intel
        }

        const manufacturerBadge = detailsPanel.querySelector('.image-manufacturer-badge');
        if (manufacturerBadge) {
            manufacturerBadge.textContent = manufacturer;
            manufacturerBadge.style.background = `linear-gradient(135deg, ${manufacturerColor} 0%, ${manufacturerColor.replace('0.95', '0.85')} 100%)`;
        }

        // Update the VRAM overlay
        const specs = component.specifications || {};
        let vramSize = '';
        let memoryType = '';

        // Try to get memory size from various sources
        if (component.memorySize) {
            vramSize = component.memorySize;
        } else if (specs.memory) {
            if (typeof specs.memory === 'object') {
                vramSize = specs.memory.size || specs.memory.capacity || specs.memory.amount || '';
            } else {
                vramSize = specs.memory;
            }
        } else if (component.memory) {
            if (typeof component.memory === 'object') {
                vramSize = component.memory.size || component.memory.capacity || component.memory.amount || '';
            } else {
                vramSize = component.memory;
            }
        }

        // Try to extract VRAM from the name if not found
        if (!vramSize && componentType === 'gpu') {
            const name = component.title || component.name || '';
            const nameMatch = name.match(/(\d+)GB/i);
            if (nameMatch) {
                vramSize = nameMatch[1];
            }
        }

        // Get memory type (GDDR6, GDDR6X, GDDR7, etc.) from various sources
        if (component.memoryType) {
            memoryType = component.memoryType;
        } else if (specs.memoryType) {
            memoryType = specs.memoryType;
        } else if (component.memory && typeof component.memory === 'object' && component.memory.type) {
            memoryType = component.memory.type;
        }

        // Build VRAM display string
        let vram = '';
        if (vramSize) {
            // Ensure vramSize has GB suffix
            const sizeStr = vramSize.toString().toUpperCase().includes('GB') ? vramSize : `${vramSize}GB`;
            if (memoryType) {
                vram = `${sizeStr} ${memoryType}`;
            } else {
                vram = sizeStr;
            }
        }

        const vramOverlay = detailsPanel.querySelector('.image-vram-overlay');
        if (vramOverlay) {
            if (vram) {
                vramOverlay.style.display = 'block';
                const vramText = vramOverlay.querySelector('.overlay-vram-text');
                if (vramText) {
                    vramText.textContent = vram;
                }
            } else {
                vramOverlay.style.display = 'none';
            }
        }

        // Update title box
        const titleBox = detailsPanel.querySelector('.title-box-text');
        if (titleBox) {
            titleBox.textContent = component.title || component.name || 'Unknown Component';
        }

        // Update the legend to highlight current selection
        const legendContainer = detailsPanel.querySelector('.savings-graph-section > div');
        if (legendContainer && this.currentAllHistories) {
            const legendHTML = this.currentAllHistories.map((item, index) => {
                const isCurrent = index === this.currentComparisonIndex;
                const componentItem = this.comparisonComponents[index];
                const component = componentItem?.component;

                // Get performance score based on component type
                let performanceScore = null;
                if (componentItem?.componentType === 'gpu' && component) {
                    performanceScore = this.getGpuPerformance(component);
                } else if (componentItem?.componentType === 'cpu' && component) {
                    performanceScore = this.getCpuPerformance(component);
                }

                // Get price
                const basePrice = parseFloat(component?.basePrice) || 0;
                const salePrice = parseFloat(component?.salePrice || component?.currentPrice) || 0;
                const displayPrice = salePrice > 0 ? salePrice : basePrice;

                return `
                    <div class="comparison-legend-item" data-comparison-index="${index}" style="display: flex; align-items: center; gap: 8px; padding: 4px 8px; background: ${isCurrent ? 'rgba(37, 99, 235, 0.1)' : 'transparent'}; border-radius: 4px; cursor: pointer; transition: background 0.2s;">
                        <div style="width: 12px; height: 12px; background: ${item.color}; border-radius: 2px; flex-shrink: 0;"></div>
                        <div style="font-size: 11px; color: ${isCurrent ? '#2563eb' : '#666'}; font-weight: ${isCurrent ? '600' : '400'}; flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${item.name}</div>
                        <div style="font-size: 11px; color: #16a34a; font-weight: 600; background: rgba(34, 197, 94, 0.1); padding: 2px 6px; border-radius: 4px; flex-shrink: 0;">$${displayPrice.toFixed(2)}</div>
                        ${performanceScore !== null ? `
                            <div style="font-size: 11px; color: #2563eb; font-weight: 600; background: rgba(37, 99, 235, 0.1); padding: 2px 6px; border-radius: 4px; flex-shrink: 0;">${(performanceScore * 100).toFixed(1)}%</div>
                        ` : ''}
                        <div class="remove-comparison-item-btn" data-remove-index="${index}" style="width: 16px; height: 16px; display: flex; align-items: center; justify-content: center; background: rgba(239, 68, 68, 0.1); color: #ef4444; border-radius: 3px; font-size: 10px; font-weight: 700; cursor: pointer; flex-shrink: 0; transition: all 0.2s;" title="Remove from comparison">×</div>
                    </div>
                `;
            }).join('');
            legendContainer.innerHTML = legendHTML;

            // Re-initialize hover functionality after updating legend
            this.initializeComparisonLegendHover();
        }

        // Check CPU compatibility with selected motherboard and update warning
        let isCpuCompatible = true;
        let incompatibilityMessage = '';
        if (componentType === 'cpu' && this.currentBuild && this.currentBuild.motherboard) {
            const selectedMotherboard = this.currentBuild.motherboard;
            const motherboardSocket = selectedMotherboard.socket || selectedMotherboard.socketType;
            const cpuSocket = component.socket || component.socketType;

            if (motherboardSocket && cpuSocket) {
                const normalizedCpuSocket = cpuSocket.toString().trim().toUpperCase();
                const normalizedMotherboardSocket = motherboardSocket.toString().trim().toUpperCase();
                isCpuCompatible = normalizedCpuSocket === normalizedMotherboardSocket;

                if (!isCpuCompatible) {
                    incompatibilityMessage = `⚠️ Incompatible with selected motherboard (${motherboardSocket} socket required, this CPU has ${cpuSocket})`;
                }
            }
        }

        // Check RAM compatibility with selected motherboard
        let isRamCompatible = true;
        if (componentType === 'ram' && this.currentBuild && this.currentBuild.motherboard) {
            const selectedMotherboard = this.currentBuild.motherboard;
            const motherboardMemoryTypes = selectedMotherboard.memoryType || [];
            const ramMemoryType = component.memoryType;

            // Ensure motherboardMemoryTypes is an array
            const memoryTypesArray = Array.isArray(motherboardMemoryTypes) ? motherboardMemoryTypes : [motherboardMemoryTypes];

            if (memoryTypesArray.length > 0 && ramMemoryType) {
                const normalizedRamType = ramMemoryType.toString().trim().toUpperCase();

                // Check if RAM type matches any of the motherboard's supported types
                isRamCompatible = memoryTypesArray.some(mbType => {
                    const normalizedMbType = mbType.toString().trim().toUpperCase();
                    return normalizedRamType.includes(normalizedMbType) || normalizedMbType.includes(normalizedRamType);
                });

                if (!isRamCompatible) {
                    const mbTypesStr = memoryTypesArray.join('/');
                    incompatibilityMessage = `⚠️ Incompatible with selected motherboard (${mbTypesStr} required, this RAM is ${ramMemoryType})`;
                }
            }
        }

        // Check motherboard compatibility with selected CPU and RAM
        let isMotherboardCompatible = true;
        let motherboardIncompatibilityMessages = [];
        if (componentType === 'motherboard' && this.currentBuild) {
            // Check CPU socket compatibility
            if (this.currentBuild.cpu) {
                const selectedCpu = this.currentBuild.cpu;
                const motherboardSocket = component.socket || component.socketType;
                const cpuSocket = selectedCpu.socket || selectedCpu.socketType;

                if (motherboardSocket && cpuSocket) {
                    const normalizedCpuSocket = cpuSocket.toString().trim().toUpperCase();
                    const normalizedMotherboardSocket = motherboardSocket.toString().trim().toUpperCase();
                    const cpuCompatible = normalizedCpuSocket === normalizedMotherboardSocket;

                    if (!cpuCompatible) {
                        isMotherboardCompatible = false;
                        motherboardIncompatibilityMessages.push(`CPU Socket Mismatch: ${motherboardSocket} (CPU has ${cpuSocket})`);
                    }
                }
            }

            // Check RAM memory type compatibility
            if (this.currentBuild.ram) {
                const selectedRam = this.currentBuild.ram;
                const motherboardMemoryTypes = component.memoryType || [];
                const ramMemoryType = selectedRam.memoryType;

                const memoryTypesArray = Array.isArray(motherboardMemoryTypes) ? motherboardMemoryTypes : [motherboardMemoryTypes];

                if (memoryTypesArray.length > 0 && ramMemoryType) {
                    const normalizedRamType = ramMemoryType.toString().trim().toUpperCase();

                    const ramCompatible = memoryTypesArray.some(mbType => {
                        const normalizedMbType = mbType.toString().trim().toUpperCase();
                        return normalizedRamType.includes(normalizedMbType) || normalizedMbType.includes(normalizedRamType);
                    });

                    if (!ramCompatible) {
                        isMotherboardCompatible = false;
                        const mbTypesStr = memoryTypesArray.join('/');
                        motherboardIncompatibilityMessages.push(`RAM Type Mismatch: ${mbTypesStr} (RAM is ${ramMemoryType})`);
                    }
                }
            }

            // Check case/motherboard form factor compatibility
            if (this.currentBuild.case) {
                const selectedCase = this.currentBuild.case;
                const caseFormFactors = selectedCase.formFactor || [];
                const caseFormFactorArray = Array.isArray(caseFormFactors) ? caseFormFactors : [caseFormFactors];
                const motherboardFormFactor = component.formFactor || '';

                if (motherboardFormFactor && caseFormFactorArray.length > 0) {
                    let caseCompatible = false;

                    // Normalize motherboard form factor (handle all variants - remove hyphens and normalize spaces)
                    const moboFFUpper = motherboardFormFactor.toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();

                    // Check motherboard type (order matters: check more specific first)
                    const isMoboITX = moboFFUpper.includes('ITX') && !moboFFUpper.includes('ATX');
                    const isMoboMicroATX = moboFFUpper.includes('MATX') || moboFFUpper.includes('MICROATX');
                    const isMoboEATX = moboFFUpper.includes('EATX');
                    const isMoboATX = !isMoboITX && !isMoboMicroATX && !isMoboEATX && moboFFUpper.includes('ATX');

                    for (const caseFF of caseFormFactorArray) {
                        const caseFFUpper = caseFF.toUpperCase().replace(/-/g, '').replace(/\s+/g, '').trim();

                        // Check case type (order matters: check more specific first)
                        const isCaseITX = caseFFUpper.includes('ITX') && !caseFFUpper.includes('ATX');
                        const isCaseMicroATX = caseFFUpper.includes('MATX') || caseFFUpper.includes('MICROATX');
                        const isCaseEATX = caseFFUpper.includes('EATX');
                        const isCaseATX = !isCaseITX && !isCaseMicroATX && !isCaseEATX && caseFFUpper.includes('ATX');

                        // E-ATX case accepts all motherboards
                        if (isCaseEATX) {
                            caseCompatible = true;
                            break;
                        }
                        // ATX case: compatible with ATX, mATX, ITX
                        else if (isCaseATX && (isMoboATX || isMoboMicroATX || isMoboITX)) {
                            caseCompatible = true;
                            break;
                        }
                        // mATX/Micro ATX case: compatible with mATX, ITX
                        else if (isCaseMicroATX && (isMoboMicroATX || isMoboITX)) {
                            caseCompatible = true;
                            break;
                        }
                        // ITX case: compatible with ITX only
                        else if (isCaseITX && isMoboITX) {
                            caseCompatible = true;
                            break;
                        }
                    }

                    if (!caseCompatible) {
                        isMotherboardCompatible = false;
                        const caseFFDisplay = caseFormFactorArray.join('/');
                        motherboardIncompatibilityMessages.push(`Too Large for Case: ${motherboardFormFactor} won't fit in ${caseFFDisplay} case`);
                    }
                }
            }

            // Set incompatibility message for motherboard
            if (motherboardIncompatibilityMessages.length > 0) {
                incompatibilityMessage = `⚠️ ${motherboardIncompatibilityMessages.join(' | ')}`;
            }
        }

        // Set overall compatibility flag
        const isCompatible = (componentType === 'cpu' ? isCpuCompatible : (componentType === 'ram' ? isRamCompatible : (componentType === 'motherboard' ? isMotherboardCompatible : true)));

        // Update or add/remove incompatibility warning overlay
        // Reuse imageContainer already declared above
        if (imageContainer) {
            let incompatibilityOverlay = imageContainer.querySelector('.image-incompatibility-overlay');

            if (!isCompatible) {
                // Add or update warning
                if (!incompatibilityOverlay) {
                    incompatibilityOverlay = document.createElement('div');
                    incompatibilityOverlay.className = 'image-incompatibility-overlay';
                    imageContainer.appendChild(incompatibilityOverlay);
                }
                incompatibilityOverlay.innerHTML = `
                    <div class="incompatibility-warning-badge">
                        ${incompatibilityMessage}
                    </div>
                `;
            } else if (incompatibilityOverlay) {
                // Remove warning if component is compatible
                incompatibilityOverlay.remove();
            }

            // Update grayscale class on image container and related elements
            const titleBox = detailsPanel.querySelector('.image-title-box');
            const productLink = detailsPanel.querySelector('.detail-product-link');

            if (!isCompatible) {
                imageContainer.classList.add('incompatible-component');
                if (titleBox) titleBox.classList.add('incompatible-component');
                if (productLink) productLink.classList.add('incompatible-component');
            } else {
                imageContainer.classList.remove('incompatible-component');
                if (titleBox) titleBox.classList.remove('incompatible-component');
                if (productLink) productLink.classList.remove('incompatible-component');
            }
        }

        // Update the "Add to Build" button styling and icon
        const addButton = detailsPanel.querySelector('.select-component-btn');
        if (addButton) {
            const icon = addButton.querySelector('i');
            if (!isCompatible) {
                addButton.classList.add('incompatible-button');
                if (icon) {
                    icon.className = 'fas fa-exclamation-triangle';
                }
            } else {
                addButton.classList.remove('incompatible-button');
                if (icon) {
                    icon.className = 'fas fa-check';
                }
            }
        }

        // Update counter text with correct component type label
        const counterElement = detailsPanel.querySelector('.comparison-counter');
        if (counterElement) {
            const componentTypeLabel = componentType === 'gpu' ? 'GPUs' : componentType === 'cpu' ? 'CPUs' : componentType === 'cooler' ? 'Coolers' : 'Components';
            counterElement.textContent = `${this.currentComparisonIndex + 1} of ${this.comparisonComponents.length} ${componentTypeLabel}`;
        }
    }

    createSavingsGraph(basePrice, salePrice, discount, savedPriceHistory) {
        const graphId = 'priceGraph_' + Date.now();

        // Use actual saved price history if available, otherwise simulate
        const priceHistory = this.generatePriceHistory(basePrice, salePrice, savedPriceHistory);

        setTimeout(() => {
            this.drawPriceChart(graphId, priceHistory, basePrice, salePrice);
        }, 100);

        return `
            <div class="savings-graph-section">
                <h4 style="font-size: 14px; font-weight: 600; color: #2563eb; margin: 0 0 16px 0; text-transform: uppercase; letter-spacing: 0.5px;">Price History (Last 30 Days)</h4>

                <canvas id="${graphId}" width="360" height="200" style="width: 100%; max-width: 360px;"></canvas>
            </div>
        `;
    }

    generatePriceHistory(basePrice, salePrice, savedPriceHistory) {
        // If we have actual saved price history, use it
        if (savedPriceHistory && Array.isArray(savedPriceHistory) && savedPriceHistory.length > 0) {
            const history = [];

            // Process each entry from the saved data
            for (const entry of savedPriceHistory) {
                // Parse the date
                const entryDate = entry.date ? new Date(entry.date) : null;

                // Get the price (try multiple possible field names)
                const entryPrice = parseFloat(entry.price || entry.currentPrice || entry.salePrice || 0);

                // Only add entries with valid date and price
                if (entryDate && entryPrice > 0) {
                    history.push({
                        date: entryDate,
                        price: entryPrice,
                        isPadded: false  // All data from database is real
                    });
                }
            }

            // Sort by date (oldest to newest)
            history.sort((a, b) => a.date - b.date);

            // Return only actual data points - no padding/backpropagation
            if (history.length > 0) {
                console.log('Using actual price history with', history.length, 'real data points (no padding)');
                return history;
            }
        }

        // Fallback: If no saved data at all, return empty array or single point
        // Don't create fake 30-day history
        console.log('No saved price history available');
        const currentPrice = salePrice > 0 ? salePrice : basePrice;

        // Return a single data point for today only
        if (currentPrice > 0) {
            return [{
                date: new Date(),
                price: currentPrice,
                isPadded: false
            }];
        }

        return [];
    }

    drawPriceChart(canvasId, priceHistory, basePrice, salePrice) {
        const canvas = document.getElementById(canvasId);
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.width;
        const height = canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Chart dimensions
        const padding = { top: 20, right: 20, bottom: 40, left: 60 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Handle empty data
        if (!priceHistory || priceHistory.length === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '12px Inter, sans-serif';
            ctx.textAlign = 'center';

            // Check if item is unavailable
            if (!salePrice && !basePrice) {
                ctx.fillText('Product currently unavailable', width / 2, height / 2 - 10);
                ctx.fillStyle = '#999';
                ctx.font = '11px Inter, sans-serif';
                ctx.fillText('No pricing data to display', width / 2, height / 2 + 10);
            } else {
                ctx.fillText('No price history available yet', width / 2, height / 2);
            }
            return;
        }

        // Find min and max prices for Y-axis
        const prices = priceHistory.map(d => d.price);
        const minPrice = Math.min(...prices) * 0.95;
        const maxPrice = Math.max(...prices) * 1.05;
        const priceRange = maxPrice - minPrice || 1; // Avoid division by zero

        // Find date range for X-axis (use actual dates from data)
        const dates = priceHistory.map(d => d.date.getTime());
        const minDate = Math.min(...dates);
        const maxDate = Math.max(...dates);

        // For single data point or very small date range, create a wider view
        let dateRange = maxDate - minDate;
        let effectiveMinDate = minDate;
        let effectiveMaxDate = maxDate;

        if (dateRange < 86400000) { // Less than 1 day
            // Expand to show a 7-day view centered on the data point
            const threeDaysMs = 3 * 24 * 60 * 60 * 1000;
            effectiveMinDate = minDate - threeDaysMs;
            effectiveMaxDate = maxDate + threeDaysMs;
            dateRange = effectiveMaxDate - effectiveMinDate;
        }

        // Helper functions - use date-based scaling
        const xScale = (date) => padding.left + ((date.getTime() - effectiveMinDate) / dateRange) * chartWidth;
        const yScale = (price) => padding.top + chartHeight - ((price - minPrice) / priceRange) * chartHeight;

        // Draw Y-axis
        ctx.strokeStyle = '#ccc';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, padding.top + chartHeight);
        ctx.stroke();

        // Draw X-axis
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top + chartHeight);
        ctx.lineTo(padding.left + chartWidth, padding.top + chartHeight);
        ctx.stroke();

        // Draw Y-axis labels and grid lines
        ctx.fillStyle = '#666';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'right';
        const ySteps = 5;
        for (let i = 0; i <= ySteps; i++) {
            const price = minPrice + (priceRange * i / ySteps);
            const y = yScale(price);

            // Grid line
            ctx.strokeStyle = '#f0f0f0';
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(padding.left + chartWidth, y);
            ctx.stroke();

            // Label
            ctx.fillText('$' + price.toFixed(0), padding.left - 5, y + 3);
        }

        // Draw X-axis labels (use effective date range for proper spacing)
        ctx.textAlign = 'center';
        const xLabels = [];

        // Create labels based on the effective date range
        const startDate = new Date(effectiveMinDate);
        const endDate = new Date(effectiveMaxDate);
        const midDate = new Date((effectiveMinDate + effectiveMaxDate) / 2);

        xLabels.push({
            date: startDate,
            label: startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });

        xLabels.push({
            date: midDate,
            label: midDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });

        xLabels.push({
            date: endDate,
            label: endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        });

        xLabels.forEach(({ date, label }) => {
            const x = xScale(date);
            ctx.fillText(label, x, padding.top + chartHeight + 20);
        });

        // Draw price line (only draw lines between actual data points)
        if (priceHistory.length > 0) {
            ctx.strokeStyle = '#2563eb';
            ctx.lineWidth = 2;
            ctx.beginPath();
            priceHistory.forEach((point, index) => {
                const x = xScale(point.date);
                const y = yScale(point.price);
                if (index === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
            });
            ctx.stroke();

            // Fill area under the line
            ctx.fillStyle = 'rgba(37, 99, 235, 0.1)';
            ctx.beginPath();
            const firstX = xScale(priceHistory[0].date);
            ctx.moveTo(firstX, padding.top + chartHeight);
            priceHistory.forEach((point) => {
                const x = xScale(point.date);
                const y = yScale(point.price);
                ctx.lineTo(x, y);
            });
            const lastX = xScale(priceHistory[priceHistory.length - 1].date);
            ctx.lineTo(lastX, padding.top + chartHeight);
            ctx.closePath();
            ctx.fill();

            // Draw data point markers (circles on actual data points)
            priceHistory.forEach((point) => {
                const x = xScale(point.date);
                const y = yScale(point.price);

                ctx.fillStyle = '#2563eb';
                ctx.beginPath();
                ctx.arc(x, y, 3, 0, Math.PI * 2);
                ctx.fill();
            });

            // Draw current price marker (last point in red)
            const currentX = xScale(priceHistory[priceHistory.length - 1].date);
            const currentY = yScale(salePrice);

            ctx.fillStyle = '#e74c3c';
            ctx.beginPath();
            ctx.arc(currentX, currentY, 4, 0, Math.PI * 2);
            ctx.fill();
        }

        // Draw original price line (dashed)
        if (priceHistory.length > 0) {
            const originalY = yScale(basePrice);
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 1;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(padding.left, originalY);
            ctx.lineTo(padding.left + chartWidth, originalY);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        // Add legend
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'left';

        // Current price
        ctx.fillStyle = '#e74c3c';
        ctx.fillRect(padding.left + 10, 5, 10, 10);
        ctx.fillStyle = '#333';
        ctx.fillText('Sale: $' + salePrice.toFixed(2), padding.left + 25, 13);

        // Original price
        ctx.strokeStyle = '#999';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(padding.left + 120, 10);
        ctx.lineTo(padding.left + 130, 10);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = '#333';
        ctx.fillText('Original: $' + basePrice.toFixed(2), padding.left + 135, 13);
    }

    closeDetailsPanel() {
        const panel = document.getElementById('componentDetailsPanel');
        panel.classList.add('hidden');
        this.currentDetailSelection = null;

        // Remove panel-expanded class from all cards
        document.querySelectorAll('.part-card.panel-expanded').forEach(card => {
            card.classList.remove('panel-expanded');
        });

        // Clear all variant card selections visually
        const selectedVariants = document.querySelectorAll('.variant-card.variant-selected');
        selectedVariants.forEach(card => {
            card.classList.remove('variant-selected');
            const indicator = card.querySelector('.selection-indicator');
            if (indicator) indicator.remove();
        });

        // Clear all component row selections visually (for CPUs and other non-variant components)
        const selectedRows = document.querySelectorAll('tr.component-main-row.component-selected');
        selectedRows.forEach(row => {
            row.classList.remove('component-selected');
            row.style.backgroundColor = '';
            row.style.borderLeft = '';
            const indicator = row.querySelector('.selection-indicator');
            if (indicator) indicator.remove();
        });

        // Clear comparison data
        this.comparisonComponents = [];
        this.currentComparisonIndex = 0;

        // Hide tooltip if visible
        this.hideGraphTooltip();

        // Remove mobile toggle button if both panels are hidden
        const statisticsPanel = document.getElementById('statisticsPanel');
        if (statisticsPanel && statisticsPanel.classList.contains('hidden')) {
            const toggleBtn = document.getElementById('mobileDetailsToggle');
            if (toggleBtn) toggleBtn.remove();
        }

        // Restore modal rounded corners
        const modalContent = document.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.setProperty('border-radius', '12px', 'important');
        }
    }

    addToBuildFromDetails() {
        if (!this.currentDetailSelection) {
            return;
        }

        const { component, componentType } = this.currentDetailSelection;

        // Close the details panel
        this.closeDetailsPanel();

        // Check if we're in a tab context (not builder)
        if (this.modalContext === 'cpu-tab' && componentType === 'cpu') {
            this.selectCPU(component);
            return;
        }

        // Close the modal
        this.closeComponentModal();

        // Select the component for the builder
        this.selectComponent(componentType, component);
    }

    toggleStatisticsPanel() {
        const statisticsPanel = document.getElementById('statisticsPanel');
        const detailsPanel = document.getElementById('componentDetailsPanel');
        const statisticsBtn = document.getElementById('viewStatisticsBtn');

        // Remove first-time glow animation on first click
        if (statisticsBtn.classList.contains('first-time-glow')) {
            statisticsBtn.classList.remove('first-time-glow');
        }

        if (statisticsPanel.classList.contains('hidden')) {
            // Show statistics panel, hide details panel
            statisticsPanel.classList.remove('hidden');
            detailsPanel.classList.add('hidden');
            statisticsBtn.innerHTML = '<i class="fas fa-times"></i> Hide Price Vs Performance';
            this.renderStatisticsScatterPlot();

            // Create mobile toggle button if on mobile
            this.createMobileDetailsToggle();

            // Unround modal right corners
            const modalContent = document.querySelector('.modal-content');
            if (modalContent) {
                modalContent.style.setProperty('border-radius', '12px 0 0 12px', 'important');
            }
        } else {
            // Hide statistics panel
            this.closeStatisticsPanel();
        }
    }

    closeStatisticsPanel() {
        const statisticsPanel = document.getElementById('statisticsPanel');
        const statisticsBtn = document.getElementById('viewStatisticsBtn');
        statisticsPanel.classList.add('hidden');
        statisticsBtn.innerHTML = '<i class="fas fa-chart-scatter"></i> View Price Vs Performance';

        // Remove panel-expanded class from all cards
        document.querySelectorAll('.part-card.panel-expanded').forEach(card => {
            card.classList.remove('panel-expanded');
        });

        // Remove mobile toggle button if both panels are hidden
        const detailsPanel = document.getElementById('componentDetailsPanel');
        if (detailsPanel && detailsPanel.classList.contains('hidden')) {
            const toggleBtn = document.getElementById('mobileDetailsToggle');
            if (toggleBtn) toggleBtn.remove();
        }

        // Restore modal rounded corners
        const modalContent = document.querySelector('.modal-content');
        if (modalContent) {
            modalContent.style.setProperty('border-radius', '12px', 'important');
        }
    }

    toggleDebugMode() {
        // Toggle debug mode
        this.debugMode = !this.debugMode;

        // Update button appearance
        const debugBtn = document.getElementById('debugBtn');
        const body = document.body;
        const partsGrid = document.getElementById('partsGrid');
        const title = document.querySelector('header h1');

        const debugSection = document.getElementById('debugSection');

        if (this.debugMode) {
            debugBtn.classList.add('active');
            body.classList.add('debug-single-column');

            // Show debug information section
            if (debugSection) {
                debugSection.style.display = 'block';
            }

            // Force single column styles with EXTREME PREJUDICE
            if (partsGrid) {
                partsGrid.classList.add('force-single-column');
                partsGrid.setAttribute('style', 'display: grid !important; grid-template-columns: 1fr !important;');
            }

            // Force performance buttons to single column
            const performanceOptions = document.querySelectorAll('.performance-options');
            performanceOptions.forEach(container => {
                container.setAttribute('style', 'display: flex !important; flex-direction: column !important; flex-wrap: nowrap !important;');
            });

            const performanceBtns = document.querySelectorAll('.performance-option-btn');
            performanceBtns.forEach(btn => {
                btn.setAttribute('style', 'width: 100% !important; max-width: 100% !important; min-width: 100% !important; flex: none !important;');
            });

            console.log('🐛 Debug mode enabled - FORCED SINGLE COLUMN MODE');
            console.log('  partsGrid classes:', partsGrid?.className);
            console.log('  partsGrid inline style:', partsGrid?.getAttribute('style'));
            console.log('  partsGrid computed columns:', window.getComputedStyle(partsGrid)?.gridTemplateColumns);
        } else {
            debugBtn.classList.remove('active');
            body.classList.remove('debug-single-column');

            // Hide debug information section
            if (debugSection) {
                debugSection.style.display = 'none';
            }

            // Remove forced styles
            if (partsGrid) {
                partsGrid.classList.remove('force-single-column');
                partsGrid.removeAttribute('style');
            }

            // Remove forced button styles
            const performanceOptions = document.querySelectorAll('.performance-options');
            performanceOptions.forEach(container => {
                container.removeAttribute('style');
            });

            const performanceBtns = document.querySelectorAll('.performance-option-btn');
            performanceBtns.forEach(btn => {
                btn.removeAttribute('style');
            });

            // Restore white title
            if (title) {
                title.removeAttribute('style');
            }

            console.log('🐛 Debug mode disabled');
        }

        // Re-render all component selectors to show/hide save counts
        this.sortAndFilterBuilderComponents('cpu');
        this.sortAndFilterBuilderComponents('motherboard');
        this.sortAndFilterBuilderComponents('ram');
        this.sortAndFilterBuilderComponents('cooler');
        this.sortAndFilterBuilderComponents('psu');
        this.sortAndFilterBuilderComponents('storage');
        this.sortAndFilterBuilderComponents('case');
        this.sortAndFilterBuilderComponents('addon');

        // Also re-render modal if open
        if (this.currentModalType) {
            this.openComponentModal(this.currentModalType);
        }
    }

    toggleCpuPerformanceMode() {
        // Toggle between single-thread and multi-thread performance
        this.cpuPerformanceMode = this.cpuPerformanceMode === 'singleThread' ? 'multiThread' : 'singleThread';
        console.log(`Switched to ${this.cpuPerformanceMode} performance mode`);
        // Re-render the scatter plot with the new performance metric
        this.renderStatisticsScatterPlot();
    }

    async renderStatisticsScatterPlot() {
        if (this.currentModalType !== 'gpu' && this.currentModalType !== 'cpu' && this.currentModalType !== 'ram' && this.currentModalType !== 'storage') {
            console.log('Cannot render scatterplot: not in GPU, CPU, RAM, or Storage mode');
            return;
        }

        const isCpuMode = this.currentModalType === 'cpu';
        const isRamMode = this.currentModalType === 'ram';
        const isStorageMode = this.currentModalType === 'storage';

        const canvas = document.getElementById('statisticsScatterPlot');
        if (!canvas) {
            console.error('Canvas element not found');
            return;
        }

        const ctx = canvas.getContext('2d');
        const width = canvas.parentElement.offsetWidth - 40; // Account for padding
        const height = 500;

        canvas.width = width;
        canvas.height = height;

        // Clear canvas
        ctx.clearRect(0, 0, width, height);

        // Show loading message
        ctx.fillStyle = '#666';
        ctx.font = '16px sans-serif';
        ctx.textAlign = 'center';
        const loadingMessage = isStorageMode ? 'Loading all storage devices...' : (isRamMode ? 'Loading all RAM modules...' : (isCpuMode ? 'Loading all CPUs...' : 'Loading all GPU variants...'));
        ctx.fillText(loadingMessage, width / 2, height / 2);

        // Fetch ALL individual products
        let allIndividualProducts = [];
        try {
            const endpoint = isStorageMode ? '/api/parts/storages' : (isRamMode ? '/api/parts/rams' : (isCpuMode ? '/api/parts/cpus' : '/api/parts/gpus?groupByModel=false'));
            const response = await fetch(endpoint);
            if (!response.ok) {
                const componentType = isStorageMode ? 'storage devices' : (isRamMode ? 'RAM modules' : (isCpuMode ? 'CPUs' : 'GPUs'));
                throw new Error(`Failed to fetch ${componentType}: ${response.status}`);
            }
            allIndividualProducts = await response.json();
            const componentType = isStorageMode ? 'Storage' : (isRamMode ? 'RAM' : (isCpuMode ? 'CPU' : 'GPU'));
            console.log(`Fetched ${allIndividualProducts.length} individual ${componentType} products for scatterplot`);
        } catch (error) {
            const componentType = isStorageMode ? 'Storage' : (isRamMode ? 'RAM' : (isCpuMode ? 'CPU' : 'GPU'));
            console.error(`Error fetching ${componentType}:`, error);
            ctx.clearRect(0, 0, width, height);
            ctx.fillStyle = '#e74c3c';
            ctx.fillText(`Error loading ${componentType} data`, width / 2, height / 2);
            return;
        }

        // Clear canvas again
        ctx.clearRect(0, 0, width, height);

        // Collect all products with performance/capacity data
        const dataPoints = [];
        allIndividualProducts.forEach(product => {
            // Filter out external/portable storage devices
            if (isStorageMode) {
                const name = (product.name || product.title || '').toLowerCase();
                const isExternal = name.includes('portable') ||
                                  name.includes('external') ||
                                  name.includes('usb 3.') ||
                                  name.includes('usb-c') ||
                                  name.includes('travel');

                if (isExternal) {
                    return; // Skip this storage device
                }
            }

            let xAxisValue; // Performance for GPU/CPU, Capacity for RAM/Storage

            if (isStorageMode) {
                // For Storage, use capacity in GB
                xAxisValue = parseFloat(product.capacityGB) || 0;
            } else if (isRamMode) {
                // For RAM, use total capacity in GB
                xAxisValue = product.totalCapacity || (product.kitSize && product.capacity ? product.kitSize * product.capacity : null);
            } else if (isCpuMode) {
                // For CPUs, check the performance mode to determine which metric to use
                xAxisValue = this.cpuPerformanceMode === 'multiThread'
                    ? this.getCpuMultiThreadPerformance(product)
                    : this.getCpuPerformance(product);
            } else {
                // For GPUs, use performance
                xAxisValue = this.getGpuPerformance(product);
            }

            const price = parseFloat(product.salePrice) || parseFloat(product.currentPrice) || parseFloat(product.basePrice) || parseFloat(product.price) || 0;

            if (xAxisValue !== null && xAxisValue > 0 && price > 0) {
                dataPoints.push({
                    name: product.title || product.name || 'Unknown',
                    performance: xAxisValue, // For RAM/Storage, this will be capacity
                    price: price,
                    product: product // Store full product object for detail rendering
                });
            }
        });

        const componentType = isStorageMode ? 'storage devices' : (isRamMode ? 'RAM modules' : (isCpuMode ? 'CPUs' : 'GPUs'));
        const dataType = isStorageMode ? 'capacity' : (isRamMode ? 'capacity' : 'performance');
        console.log(`Scatterplot: Found ${dataPoints.length} ${componentType} with ${dataType} data`);
        console.log(`Sample ${componentType} data:`, dataPoints[0]);

        if (dataPoints.length === 0) {
            ctx.fillStyle = '#666';
            ctx.font = '16px sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`No ${componentType} ${dataType} data available`, width / 2, height / 2);
            return;
        }

        // Set up padding and chart dimensions
        const padding = { top: 20, right: 40, bottom: 70, left: 90 };
        const chartWidth = width - padding.left - padding.right;
        const chartHeight = height - padding.top - padding.bottom;

        // Find min/max values
        const maxPerformance = Math.max(...dataPoints.map(p => p.performance));
        const minPerformance = Math.min(...dataPoints.map(p => p.performance));
        const maxPrice = Math.max(...dataPoints.map(p => p.price));
        const minPrice = Math.min(...dataPoints.map(p => p.price));

        // For CPUs with high-priced outliers, use logarithmic scale above $1000
        const usePriceLogScale = isCpuMode && maxPrice > 1000;
        const priceLogThreshold = 1000;

        // For multi-thread performance, use logarithmic scale above 100% (1.0)
        const usePerformanceLogScale = isCpuMode && this.cpuPerformanceMode === 'multiThread' && maxPerformance > 1.0;
        const performanceLogThreshold = 1.0;

        // Helper function to transform price to Y-axis position
        const priceToScale = (price) => {
            if (!usePriceLogScale || price <= priceLogThreshold) {
                return price;
            }
            // Logarithmic scaling above threshold
            // Map $1000-$5000 to a compressed range
            const logBase = Math.log(price / priceLogThreshold);
            return priceLogThreshold + (logBase * 200); // 200 is compression factor
        };

        // Helper function to reverse the transformation for labels
        const scaleToPrice = (scaledValue) => {
            if (!usePriceLogScale || scaledValue <= priceLogThreshold) {
                return scaledValue;
            }
            // Reverse logarithmic transformation
            const logValue = (scaledValue - priceLogThreshold) / 200;
            return priceLogThreshold * Math.exp(logValue);
        };

        // Helper function to transform performance to X-axis position
        const performanceToScale = (performance) => {
            if (!usePerformanceLogScale || performance <= performanceLogThreshold) {
                return performance;
            }
            // Logarithmic scaling above 100% (1.0)
            // Compress values above 1.0 to make the graph more readable
            const logBase = Math.log(performance / performanceLogThreshold);
            return performanceLogThreshold + (logBase * 0.3); // 0.3 is compression factor
        };

        // Helper function to reverse the transformation for labels
        const scaleToPerformance = (scaledValue) => {
            if (!usePerformanceLogScale || scaledValue <= performanceLogThreshold) {
                return scaledValue;
            }
            // Reverse logarithmic transformation
            const logValue = (scaledValue - performanceLogThreshold) / 0.3;
            return performanceLogThreshold * Math.exp(logValue);
        };

        // Transform prices for scaling
        const scaledMinPrice = priceToScale(minPrice);
        const scaledMaxPrice = priceToScale(maxPrice);

        // Round price range for cleaner axis
        const priceRange = scaledMaxPrice - scaledMinPrice;
        const priceStep = Math.ceil(priceRange / 5 / 100) * 100; // Round to nearest 100
        const roundedMinPrice = Math.floor(scaledMinPrice / 100) * 100;
        const roundedMaxPrice = roundedMinPrice + (priceStep * 5);

        // Transform performance for scaling
        const scaledMinPerformance = performanceToScale(minPerformance);
        const scaledMaxPerformance = performanceToScale(maxPerformance);

        // Draw grid lines and Y-axis labels (price)
        ctx.strokeStyle = '#e0e0e0';
        ctx.lineWidth = 1;
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';

        for (let i = 0; i <= 5; i++) {
            const scaledValue = roundedMinPrice + (priceStep * i);
            const actualPrice = scaleToPrice(scaledValue);
            const y = height - padding.bottom - (chartHeight / 5) * i;

            // Grid line
            ctx.strokeStyle = '#e0e0e0';
            ctx.beginPath();
            ctx.moveTo(padding.left, y);
            ctx.lineTo(width - padding.right, y);
            ctx.stroke();

            // Y-axis label - show actual price
            ctx.fillStyle = '#666';
            ctx.fillText('$' + actualPrice.toFixed(0), padding.left - 10, y);
        }

        // Draw grid lines and X-axis labels (performance)
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        for (let i = 0; i <= 5; i++) {
            const scaledValue = scaledMinPerformance + ((scaledMaxPerformance - scaledMinPerformance) / 5) * i;
            const actualPerformance = scaleToPerformance(scaledValue);
            const x = padding.left + (chartWidth / 5) * i;

            // Grid line
            ctx.strokeStyle = '#e0e0e0';
            ctx.beginPath();
            ctx.moveTo(x, padding.top);
            ctx.lineTo(x, height - padding.bottom);
            ctx.stroke();

            // X-axis label
            ctx.fillStyle = '#666';
            if (isStorageMode) {
                // For Storage, show capacity in TB
                const capacityTB = actualPerformance / 1000;
                ctx.fillText(capacityTB.toFixed(capacityTB < 1 ? 2 : 1) + ' TB', x, height - padding.bottom + 5);
            } else if (isRamMode) {
                // For RAM, show capacity in GB
                ctx.fillText(actualPerformance.toFixed(0) + ' GB', x, height - padding.bottom + 5);
            } else {
                // For GPU/CPU, display as percentage
                ctx.fillText((actualPerformance * 100).toFixed(0) + '%', x, height - padding.bottom + 5);
            }
        }

        // Draw axes
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(padding.left, padding.top);
        ctx.lineTo(padding.left, height - padding.bottom);
        ctx.lineTo(width - padding.right, height - padding.bottom);
        ctx.stroke();

        // Draw logarithmic scale indicator for price if active
        if (usePriceLogScale) {
            const scaledThreshold = priceToScale(priceLogThreshold);
            const yThreshold = height - padding.bottom - ((scaledThreshold - roundedMinPrice) / (roundedMaxPrice - roundedMinPrice)) * chartHeight;

            // Draw dashed line at $1000
            ctx.strokeStyle = 'rgba(255, 152, 0, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(padding.left, yThreshold);
            ctx.lineTo(width - padding.right, yThreshold);
            ctx.stroke();
            ctx.setLineDash([]);

            // Add label
            ctx.fillStyle = 'rgba(255, 152, 0, 0.9)';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'bottom';
            ctx.fillText('Logarithmic scale above $1000', padding.left + 5, yThreshold - 3);
        }

        // Draw logarithmic scale indicator for performance if active
        if (usePerformanceLogScale) {
            const scaledThreshold = performanceToScale(performanceLogThreshold);
            const xThreshold = padding.left + ((scaledThreshold - scaledMinPerformance) / (scaledMaxPerformance - scaledMinPerformance)) * chartWidth;

            // Draw dashed line at 100%
            ctx.strokeStyle = 'rgba(37, 99, 235, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.beginPath();
            ctx.moveTo(xThreshold, padding.top);
            ctx.lineTo(xThreshold, height - padding.bottom);
            ctx.stroke();
            ctx.setLineDash([]);

            // Add label
            ctx.fillStyle = 'rgba(37, 99, 235, 0.9)';
            ctx.font = 'bold 11px sans-serif';
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.save();
            ctx.translate(xThreshold + 3, padding.top + 5);
            ctx.rotate(Math.PI / 2);
            ctx.fillText('Logarithmic scale above 100%', 0, 0);
            ctx.restore();
        }

        // Highlight price range filter if active
        if (this.minPrice !== null || this.maxPrice !== null) {
            const filterMinPrice = this.minPrice !== null ? this.minPrice : scaleToPrice(roundedMinPrice);
            const filterMaxPrice = this.maxPrice !== null ? this.maxPrice : scaleToPrice(roundedMaxPrice);

            // Calculate y coordinates for the price range (using scaled values)
            const scaledFilterMin = priceToScale(filterMinPrice);
            const scaledFilterMax = priceToScale(filterMaxPrice);
            const yMin = height - padding.bottom - ((scaledFilterMax - roundedMinPrice) / (roundedMaxPrice - roundedMinPrice)) * chartHeight;
            const yMax = height - padding.bottom - ((scaledFilterMin - roundedMinPrice) / (roundedMaxPrice - roundedMinPrice)) * chartHeight;

            // Draw semi-transparent rectangle
            ctx.fillStyle = 'rgba(37, 99, 235, 0.1)';
            ctx.fillRect(padding.left, yMin, chartWidth, yMax - yMin);

            // Draw border lines for the price range
            ctx.strokeStyle = 'rgba(37, 99, 235, 0.6)';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]); // Dashed line

            // Top border (max price)
            if (this.maxPrice !== null) {
                ctx.beginPath();
                ctx.moveTo(padding.left, yMin);
                ctx.lineTo(width - padding.right, yMin);
                ctx.stroke();

                // Add label for max price
                ctx.fillStyle = '#2563eb';
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'bottom';
                ctx.fillText(`Max: $${filterMaxPrice.toFixed(0)}`, padding.left + 5, yMin - 3);
            }

            // Bottom border (min price)
            if (this.minPrice !== null) {
                ctx.beginPath();
                ctx.moveTo(padding.left, yMax);
                ctx.lineTo(width - padding.right, yMax);
                ctx.stroke();

                // Add label for min price
                ctx.fillStyle = '#2563eb';
                ctx.font = 'bold 11px sans-serif';
                ctx.textAlign = 'left';
                ctx.textBaseline = 'top';
                ctx.fillText(`Min: $${filterMinPrice.toFixed(0)}`, padding.left + 5, yMax + 3);
            }

            // Reset line dash
            ctx.setLineDash([]);
        }

        // Determine the currently selected component for this mode
        const selectedComponent = this.currentBuild
            ? (isStorageMode ? this.currentBuild.storage
                : isRamMode ? this.currentBuild.ram
                : isCpuMode ? this.currentBuild.cpu
                : this.currentBuild.gpu)
            : null;
        const selectedName = selectedComponent
            ? (selectedComponent.title || selectedComponent.name || '').trim().toLowerCase()
            : null;

        // Helper to draw a 5-pointed star
        const drawStar = (cx, cy, outerRadius, innerRadius) => {
            ctx.beginPath();
            for (let i = 0; i < 10; i++) {
                const radius = i % 2 === 0 ? outerRadius : innerRadius;
                const angle = (Math.PI / 2 * -1) + (Math.PI / 5) * i;
                const sx = cx + Math.cos(angle) * radius;
                const sy = cy + Math.sin(angle) * radius;
                if (i === 0) ctx.moveTo(sx, sy);
                else ctx.lineTo(sx, sy);
            }
            ctx.closePath();
        };

        // Draw points with hover detection capability
        this.scatterPlotPoints = []; // Store for hover detection
        let selectedPointInfo = null; // Track selected point to draw on top

        // For RAM/Storage: pre-rank all items by value-per-dollar so the gradient
        // is distributed evenly (guaranteed ~50% green, ~50% warm)
        let rankMap = null;
        if (isRamMode || isStorageMode) {
            const ranked = dataPoints
                .map((p, i) => ({ i, val: p.performance / p.price }))
                .sort((a, b) => a.val - b.val);
            rankMap = new Map();
            ranked.forEach((item, rank) => rankMap.set(item.i, rank / Math.max(ranked.length - 1, 1)));
        }

        dataPoints.forEach((point, index) => {
            const scaledPerformance = performanceToScale(point.performance);
            const x = padding.left + ((scaledPerformance - scaledMinPerformance) / (scaledMaxPerformance - scaledMinPerformance)) * chartWidth;
            const scaledPrice = priceToScale(point.price);
            const y = height - padding.bottom - ((scaledPrice - roundedMinPrice) / (roundedMaxPrice - roundedMinPrice)) * chartHeight;

            // Check CPU compatibility with selected motherboard
            let isCompatible = true;
            if (isCpuMode && this.currentBuild && this.currentBuild.motherboard) {
                const selectedMotherboard = this.currentBuild.motherboard;
                const motherboardSocket = selectedMotherboard.socket || selectedMotherboard.socketType;
                const cpuSocket = point.product.socket || point.product.socketType;

                if (motherboardSocket && cpuSocket) {
                    const normalizedCpuSocket = cpuSocket.toString().trim().toUpperCase();
                    const normalizedMotherboardSocket = motherboardSocket.toString().trim().toUpperCase();
                    isCompatible = normalizedCpuSocket === normalizedMotherboardSocket;
                }
            }

            // Check RAM compatibility with selected motherboard
            if (isRamMode && this.currentBuild && this.currentBuild.motherboard) {
                const selectedMotherboard = this.currentBuild.motherboard;
                const motherboardMemoryTypes = selectedMotherboard.memoryType || [];
                const ramMemoryType = point.product.memoryType;

                // Ensure motherboardMemoryTypes is an array
                const memoryTypesArray = Array.isArray(motherboardMemoryTypes) ? motherboardMemoryTypes : [motherboardMemoryTypes];

                if (memoryTypesArray.length > 0 && ramMemoryType) {
                    const normalizedRamType = ramMemoryType.toString().trim().toUpperCase();

                    // Check if RAM type matches any of the motherboard's supported types
                    isCompatible = memoryTypesArray.some(mbType => {
                        const normalizedMbType = mbType.toString().trim().toUpperCase();
                        return normalizedRamType.includes(normalizedMbType) || normalizedMbType.includes(normalizedRamType);
                    });
                }
            }

            // Color based on value proposition (performance per dollar)
            const performancePerDollar = point.performance / point.price;
            const maxPerformancePerDollar = Math.max(...dataPoints.map(p => p.performance / p.price));

            // RAM/Storage: use rank-based percentile so the gradient is evenly distributed
            // (~50% green, ~50% warm). GPU/CPU: keep raw ratio relative to best value.
            const colorRatio = rankMap ? rankMap.get(index) : (performancePerDollar / maxPerformancePerDollar);

            // Green for good value, red for poor value
            const r = Math.round(255 * (1 - colorRatio));
            const g = Math.round(255 * colorRatio);
            const b = 100;

            // Check if this is the currently selected component
            const pointName = (point.name || '').trim().toLowerCase();
            const isSelected = selectedName && pointName === selectedName;

            if (isSelected) {
                // Defer drawing the selected point so it renders on top
                selectedPointInfo = { x, y, point, r, g, b, isCompatible };
            } else {
                // Draw regular point with reduced opacity if incompatible
                const opacity = isCompatible ? 1.0 : 0.15;
                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
                ctx.beginPath();
                ctx.arc(x, y, 5, 0, 2 * Math.PI);
                ctx.fill();
                ctx.strokeStyle = `rgba(0, 0, 0, ${opacity * 0.5})`;
                ctx.lineWidth = 1;
                ctx.stroke();
            }

            // Store point data for hover detection
            this.scatterPlotPoints.push({
                x: x,
                y: y,
                data: point,
                color: `rgb(${r}, ${g}, ${b})`,
                isCompatible: isCompatible
            });
        });

        // Draw the selected component as a gold star on top of all other points
        if (selectedPointInfo) {
            const { x, y } = selectedPointInfo;

            // Gold star
            ctx.fillStyle = '#FFD700';
            drawStar(x, y, 10, 4.5);
            ctx.fill();
            ctx.strokeStyle = '#B8860B';
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Draw axis labels
        ctx.fillStyle = '#333';
        ctx.font = 'bold 14px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        // X-axis label
        if (isStorageMode) {
            ctx.fillText('Capacity (TB)', width / 2, height - 25);
        } else if (isRamMode) {
            ctx.fillText('Capacity (GB)', width / 2, height - 25);
        } else {
            ctx.fillText('Performance (%)', width / 2, height - 25);
        }

        // Y-axis label
        ctx.save();
        ctx.translate(25, height / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText('Price (USD)', 0, 0);
        ctx.restore();

        // Update the panel header title
        const panelHeaderTitle = document.getElementById('statisticsPanelHeaderTitle');
        if (panelHeaderTitle) {
            if (isStorageMode) {
                panelHeaderTitle.textContent = 'Storage Capacity vs Price';
            } else if (isRamMode) {
                panelHeaderTitle.textContent = 'RAM Capacity vs Price';
            } else {
                panelHeaderTitle.textContent = isCpuMode ? 'CPU Performance vs Price' : 'GPU Performance vs Price';
            }
        }

        // Update the HTML title to be clickable for CPU mode
        const titleElement = document.getElementById('statisticsTitleText');

        if (isStorageMode) {
            // For Storage, show capacity in TB (not clickable)
            titleElement.textContent = 'Capacity (TB)';
            titleElement.style.background = 'transparent';
            titleElement.style.color = '#333';
            titleElement.style.cursor = 'default';
            titleElement.style.padding = '0';
            titleElement.style.borderRadius = '0';
            titleElement.onclick = null;
            titleElement.onmouseenter = null;
            titleElement.onmouseleave = null;
        } else if (isRamMode) {
            // For RAM, show capacity in GB (not clickable)
            titleElement.textContent = 'Capacity (GB)';
            titleElement.style.background = 'transparent';
            titleElement.style.color = '#333';
            titleElement.style.cursor = 'default';
            titleElement.style.padding = '0';
            titleElement.style.borderRadius = '0';
            titleElement.onclick = null;
            titleElement.onmouseenter = null;
            titleElement.onmouseleave = null;
        } else if (isCpuMode) {
            const perfType = this.cpuPerformanceMode === 'multiThread' ? 'Multi-Thread Performance' : 'Single-Thread Performance';
            titleElement.textContent = perfType;
            titleElement.style.background = '#2563eb';
            titleElement.style.color = 'white';
            titleElement.style.cursor = 'pointer';
            titleElement.style.transition = 'background 0.3s';
            titleElement.style.padding = '10px 20px';
            titleElement.style.borderRadius = '6px';
            titleElement.onclick = toggleCpuPerformanceMode;

            // Add hover effect
            titleElement.onmouseenter = function() {
                this.style.background = '#1e40af';
            };
            titleElement.onmouseleave = function() {
                this.style.background = '#2563eb';
            };
        } else {
            titleElement.textContent = 'GPU Performance vs Price';
            titleElement.style.background = 'transparent';
            titleElement.style.color = '#333';
            titleElement.style.cursor = 'default';
            titleElement.style.padding = '0';
            titleElement.style.borderRadius = '0';
            titleElement.onclick = null;
            titleElement.onmouseenter = null;
            titleElement.onmouseleave = null;
        }

        // Add legend and statistics
        const legend = document.getElementById('statisticsLegend');
        const avgPrice = (dataPoints.reduce((sum, p) => sum + p.price, 0) / dataPoints.length).toFixed(2);

        let componentLabel, thirdStatValue, thirdStatLabel, colorGuideText, valueExplanation;

        if (isStorageMode) {
            componentLabel = 'Storage Devices';
            // Calculate average GB per dollar (capacity per dollar)
            const avgGBPerDollar = dataPoints.reduce((sum, p) => sum + (p.performance / p.price), 0) / dataPoints.length;
            thirdStatValue = avgGBPerDollar.toFixed(2);
            thirdStatLabel = 'Avg GB per $';
            colorGuideText = '<strong style="color: #222;">Color Guide:</strong> <span style="display: inline-block; width: 12px; height: 12px; background: rgb(100, 255, 100); border-radius: 50%; margin: 0 4px; vertical-align: middle;"></span><span style="color: #0f6124; font-weight: 600;">Best Value</span> <span style="margin: 0 8px; color: #333;">→</span> <span style="display: inline-block; width: 12px; height: 12px; background: rgb(255, 100, 100); border-radius: 50%; margin: 0 4px; vertical-align: middle;"></span><span style="color: #a93226; font-weight: 600;">Lower Value</span>';
            valueExplanation = 'Value = Capacity per Dollar (GB/$). Higher GB/$ = Better Value';
        } else if (isRamMode) {
            componentLabel = 'RAM Modules';
            // Calculate average GB per dollar for RAM
            const avgGBPerDollar = dataPoints.reduce((sum, p) => sum + (p.performance / p.price), 0) / dataPoints.length;
            thirdStatValue = avgGBPerDollar.toFixed(2);
            thirdStatLabel = 'Avg GB per $';
            colorGuideText = '<strong style="color: #222;">Color Guide:</strong> <span style="display: inline-block; width: 12px; height: 12px; background: rgb(100, 255, 100); border-radius: 50%; margin: 0 4px; vertical-align: middle;"></span><span style="color: #0f6124; font-weight: 600;">Best Value</span> <span style="margin: 0 8px; color: #333;">→</span> <span style="display: inline-block; width: 12px; height: 12px; background: rgb(255, 100, 100); border-radius: 50%; margin: 0 4px; vertical-align: middle;"></span><span style="color: #a93226; font-weight: 600;">Lower Value</span>';
            valueExplanation = 'Value = Capacity per Dollar (GB/$). Higher GB/$ = Better Value';
        } else if (isCpuMode) {
            componentLabel = 'CPUs';
            const avgPerf = (dataPoints.reduce((sum, p) => sum + p.performance, 0) / dataPoints.length).toFixed(3);
            thirdStatValue = avgPerf;
            thirdStatLabel = 'Avg Performance';
            const maxPerfNote = this.cpuPerformanceMode === 'multiThread'
                ? 'AMD Ryzen 9 7950X = 1.0'
                : 'Intel Core i9-13900K = 1.0';
            colorGuideText = '<strong style="color: #222;">Color Guide:</strong> <span style="display: inline-block; width: 12px; height: 12px; background: rgb(100, 255, 100); border-radius: 50%; margin: 0 4px; vertical-align: middle;"></span><span style="color: #0f6124; font-weight: 600;">Best Value</span> <span style="margin: 0 8px; color: #333;">→</span> <span style="display: inline-block; width: 12px; height: 12px; background: rgb(255, 100, 100); border-radius: 50%; margin: 0 4px; vertical-align: middle;"></span><span style="color: #a93226; font-weight: 600;">Lower Value</span>';
            valueExplanation = `Value = Performance per Dollar. Performance normalized 0-1 (${maxPerfNote})`;
        } else {
            componentLabel = 'GPUs';
            const avgPerf = (dataPoints.reduce((sum, p) => sum + p.performance, 0) / dataPoints.length).toFixed(3);
            thirdStatValue = avgPerf;
            thirdStatLabel = 'Avg Performance';
            colorGuideText = '<strong style="color: #222;">Color Guide:</strong> <span style="display: inline-block; width: 12px; height: 12px; background: rgb(100, 255, 100); border-radius: 50%; margin: 0 4px; vertical-align: middle;"></span><span style="color: #0f6124; font-weight: 600;">Best Value</span> <span style="margin: 0 8px; color: #333;">→</span> <span style="display: inline-block; width: 12px; height: 12px; background: rgb(255, 100, 100); border-radius: 50%; margin: 0 4px; vertical-align: middle;"></span><span style="color: #a93226; font-weight: 600;">Lower Value</span>';
            valueExplanation = 'Value = Performance per Dollar. Performance normalized 0-1 (RTX 5090 = 1.0)';
        }

        legend.innerHTML = `
            <div id="statisticsSummary" style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 15px;">
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 15px;">
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: 700; color: #2563eb;">${dataPoints.length}</div>
                        <div style="font-size: 12px; color: #666;">Total ${componentLabel}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: 700; color: #2563eb;">$${avgPrice}</div>
                        <div style="font-size: 12px; color: #666;">Average Price</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 24px; font-weight: 700; color: #2563eb;">${thirdStatValue}</div>
                        <div style="font-size: 12px; color: #666;">${thirdStatLabel}</div>
                    </div>
                </div>
                <div style="text-align: center; padding-top: 15px; border-top: 1px solid #e0e0e0;">
                    <p style="margin: 8px 0; font-size: 13px;">
                        ${colorGuideText}
                        ${selectedComponent ? '<span style="margin: 0 8px; color: #333;">|</span> <span style="color: #FFD700; font-size: 16px; vertical-align: middle;">&#9733;</span> <span style="color: #B8860B; font-weight: 600;">Your Selection</span>' : ''}
                    </p>
                    <p style="font-size: 11px; color: #999; margin: 8px 0 0 0;">
                        ${valueExplanation}
                    </p>
                </div>
            </div>
            <div id="selectedGpuFromScatter" style="margin-top: 20px;"></div>
        `;

        // Remove old event listeners if they exist
        if (this.scatterPlotHoverSetup && this.scatterPlotHandlers) {
            canvas.removeEventListener('mousemove', this.scatterPlotHandlers.mousemove);
            canvas.removeEventListener('mouseleave', this.scatterPlotHandlers.mouseleave);
            canvas.removeEventListener('click', this.scatterPlotHandlers.click);
        }

        // Store event handler references so we can remove them later
        this.scatterPlotHandlers = {
            mousemove: (e) => this.handleScatterPlotHover(e, canvas, padding),
            mouseleave: () => this.clearScatterPlotHover(canvas),
            click: (e) => this.handleScatterPlotClick(e, canvas)
        };

        // Add hover/tooltip and click functionality
        canvas.addEventListener('mousemove', this.scatterPlotHandlers.mousemove);
        canvas.addEventListener('mouseleave', this.scatterPlotHandlers.mouseleave);
        canvas.addEventListener('click', this.scatterPlotHandlers.click);
        this.scatterPlotHoverSetup = true;
    }

    handleScatterPlotHover(event, canvas, padding) {
        if (!this.scatterPlotPoints) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Find nearest point within threshold
        let nearestPoint = null;
        let minDistance = 15; // Hover threshold

        this.scatterPlotPoints.forEach(point => {
            const distance = Math.sqrt(Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2));
            if (distance < minDistance) {
                minDistance = distance;
                nearestPoint = point;
            }
        });

        if (nearestPoint) {
            // Show tooltip
            canvas.style.cursor = 'pointer';
            canvas.title = `${nearestPoint.data.name}\nPrice: $${nearestPoint.data.price.toFixed(2)}\nPerformance: ${(nearestPoint.data.performance * 100).toFixed(1)}%\nValue: ${(nearestPoint.data.performance / nearestPoint.data.price * 1000).toFixed(2)} perf/$1000`;
        } else {
            canvas.style.cursor = 'default';
            canvas.title = '';
        }
    }

    clearScatterPlotHover(canvas) {
        canvas.style.cursor = 'default';
        canvas.title = '';
    }

    handleScatterPlotClick(event, canvas) {
        if (!this.scatterPlotPoints) return;

        const rect = canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        // Find nearest point within threshold
        let nearestPoint = null;
        let minDistance = 15; // Click threshold

        this.scatterPlotPoints.forEach(point => {
            const distance = Math.sqrt(Math.pow(mouseX - point.x, 2) + Math.pow(mouseY - point.y, 2));
            if (distance < minDistance) {
                minDistance = distance;
                nearestPoint = point;
            }
        });

        if (nearestPoint) {
            this.renderSelectedComponentFromScatter(nearestPoint.data.product);
        }
    }

    renderSelectedComponentFromScatter(component) {
        const isCpuMode = this.currentModalType === 'cpu';
        const isGpuMode = this.currentModalType === 'gpu';
        const isRamMode = this.currentModalType === 'ram';
        const isStorageMode = this.currentModalType === 'storage';

        if (isGpuMode) {
            this.renderSelectedGpuFromScatter(component);
        } else if (isCpuMode) {
            this.renderSelectedCpuFromScatter(component);
        } else if (isRamMode) {
            this.renderSelectedRamFromScatter(component);
        } else if (isStorageMode) {
            this.renderSelectedStorageFromScatter(component);
        }
    }

    renderSelectedCpuFromScatter(cpu) {
        const container = document.getElementById('selectedGpuFromScatter');
        const summary = document.getElementById('statisticsSummary');

        if (!container) return;

        // Hide the statistics summary
        if (summary) {
            summary.style.display = 'none';
        }

        const name = cpu.title || cpu.name || 'Unknown CPU';
        const imageUrl = cpu.imageUrl || cpu.image || '';
        const sourceUrl = cpu.sourceUrl || cpu.url || '#';
        const manufacturer = cpu.manufacturer || 'Unknown';

        console.log('Rendering CPU:', { name, imageUrl, sourceUrl });

        const basePrice = parseFloat(cpu.basePrice) || 0;
        const salePrice = parseFloat(cpu.salePrice) || basePrice;
        const currentPrice = parseFloat(cpu.currentPrice) || salePrice;
        const isOnSale = salePrice < basePrice && salePrice > 0;
        const discount = isOnSale ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0;

        // Determine manufacturer color
        const manufacturerLower = manufacturer.toLowerCase();
        let manufacturerColor = 'rgba(37, 99, 235, 0.95)'; // default purple
        if (manufacturerLower.includes('amd') || manufacturerLower.includes('ryzen')) {
            manufacturerColor = 'rgba(220, 38, 38, 0.95)'; // red for AMD
        } else if (manufacturerLower.includes('intel') || manufacturerLower.includes('core')) {
            manufacturerColor = 'rgba(59, 130, 246, 0.95)'; // blue for Intel
        }

        // Get CPU specs
        const specs = cpu.specifications || cpu.specs || {};
        let coreCount = '';
        let threadCount = '';

        // Try to get core/thread count
        if (cpu.coreCount) {
            coreCount = cpu.coreCount;
        } else if (specs.cores) {
            coreCount = specs.cores;
        }

        if (cpu.threadCount) {
            threadCount = cpu.threadCount;
        } else if (specs.threads) {
            threadCount = specs.threads;
        }

        // Build CPU specs display string
        let cpuSpecs = '';
        if (coreCount && threadCount) {
            cpuSpecs = `${coreCount}C / ${threadCount}T`;
        } else if (coreCount) {
            cpuSpecs = `${coreCount} Cores`;
        }

        // Store the selected CPU for comparison
        this.selectedScatterCpu = cpu;

        // Check CPU compatibility with selected motherboard
        let isCpuCompatible = true;
        let incompatibilityMessage = '';
        if (this.currentBuild && this.currentBuild.motherboard) {
            const selectedMotherboard = this.currentBuild.motherboard;
            const motherboardSocket = selectedMotherboard.socket || selectedMotherboard.socketType;
            const cpuSocket = cpu.socket || cpu.socketType;

            if (motherboardSocket && cpuSocket) {
                const normalizedCpuSocket = cpuSocket.toString().trim().toUpperCase();
                const normalizedMotherboardSocket = motherboardSocket.toString().trim().toUpperCase();
                isCpuCompatible = normalizedCpuSocket === normalizedMotherboardSocket;

                if (!isCpuCompatible) {
                    incompatibilityMessage = `⚠️ Incompatible with selected motherboard (${motherboardSocket} socket required, this CPU has ${cpuSocket})`;
                }
            }
        }

        // Style it exactly like component details panel
        let html = `
            <div class="image-title-box ${!isCpuCompatible ? 'incompatible-component' : ''}">
                <div class="title-box-text">${name}</div>
            </div>
        `;

        if (imageUrl) {
            html += `
                <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer" class="detail-product-link ${!isCpuCompatible ? 'incompatible-component' : ''}">
                    <div class="detail-image-container ${!isCpuCompatible ? 'incompatible-component' : ''}">
                        <img src="${imageUrl}" alt="${name}" class="detail-image" data-tooltip-text="${name}" onerror="this.parentElement.innerHTML='<div class=\\'detail-image-placeholder\\'><i class=\\'fas fa-image\\' style=\\'font-size: 48px; color: #ccc;\\'></i></div>'">
                        <div class="image-manufacturer-badge" style="background: linear-gradient(135deg, ${manufacturerColor} 0%, ${manufacturerColor.replace('0.95', '0.85')} 100%);">${manufacturer}</div>
                        ${!isCpuCompatible ? `
                            <div class="image-incompatibility-overlay">
                                <div class="incompatibility-warning-badge">
                                    ${incompatibilityMessage}
                                </div>
                            </div>
                        ` : ''}
                        ${isOnSale ? `
                            <div class="image-price-overlay">
                                <div class="overlay-sale-price">$${salePrice.toFixed(2)}</div>
                                <div class="overlay-original-price">$${basePrice.toFixed(2)}</div>
                                <div class="overlay-discount" style="background: ${this.getDiscountColor(discount)}">${discount}% OFF</div>
                            </div>
                        ` : `
                            <div class="image-price-overlay">
                                <div class="overlay-current-price">$${currentPrice.toFixed(2)}</div>
                            </div>
                        `}
                    </div>
                </a>
            `;
        } else {
            html += `<p style="color: #999; font-style: italic; text-align: center; padding: 20px;">No image available</p>`;
        }

        // Add compare button with incompatibility styling if needed
        html += `
            <button class="select-component-btn ${!isCpuCompatible ? 'incompatible-button' : ''}" onclick="pcBuilder.compareToSimilarCPUs()" style="width: 100%; margin-top: 15px;">
                <i class="fas ${!isCpuCompatible ? 'fa-exclamation-triangle' : 'fa-chart-line'}"></i> Compare to Similar CPUs
            </button>
        `;

        container.innerHTML = html;

        // Initialize tooltip for the image
        this.initializeImageTooltip();

        // Scroll to show the selected CPU
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    renderSelectedGpuFromScatter(gpu) {
        const container = document.getElementById('selectedGpuFromScatter');
        const summary = document.getElementById('statisticsSummary');

        if (!container) return;

        // Hide the statistics summary
        if (summary) {
            summary.style.display = 'none';
        }

        const name = gpu.title || gpu.name || 'Unknown GPU';
        const imageUrl = gpu.imageUrl || gpu.image || '';
        const sourceUrl = gpu.sourceUrl || gpu.url || '#';
        const manufacturer = gpu.manufacturer || 'Unknown';

        console.log('Rendering GPU:', { name, imageUrl, sourceUrl });

        const basePrice = parseFloat(gpu.basePrice) || 0;
        const salePrice = parseFloat(gpu.salePrice) || basePrice;
        const currentPrice = parseFloat(gpu.currentPrice) || salePrice;
        const isOnSale = salePrice < basePrice && salePrice > 0;
        const discount = isOnSale ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0;

        // Determine manufacturer color
        const manufacturerLower = manufacturer.toLowerCase();
        let manufacturerColor = 'rgba(37, 99, 235, 0.95)'; // default purple
        if (manufacturerLower.includes('amd') || manufacturerLower.includes('radeon')) {
            manufacturerColor = 'rgba(220, 38, 38, 0.95)'; // red for AMD
        } else if (manufacturerLower.includes('nvidia') || manufacturerLower.includes('geforce')) {
            manufacturerColor = 'rgba(34, 197, 94, 0.95)'; // green for NVIDIA
        } else if (manufacturerLower.includes('intel') || manufacturerLower.includes('arc')) {
            manufacturerColor = 'rgba(59, 130, 246, 0.95)'; // light blue for Intel
        }

        // Get VRAM
        const specs = gpu.specifications || gpu.specs || {};
        let vramSize = '';
        let memoryType = '';

        // Try to get VRAM size from various sources
        if (gpu.memorySize) {
            vramSize = gpu.memorySize;
        } else if (specs.memory) {
            vramSize = specs.memory;
        } else if (gpu.memory) {
            if (typeof gpu.memory === 'object') {
                vramSize = gpu.memory.size || gpu.memory.capacity || gpu.memory.amount || '';
            } else {
                vramSize = gpu.memory;
            }
        }

        // Try to extract VRAM from the name if not found
        if (!vramSize) {
            const nameMatch = name.match(/(\d+)GB/i);
            if (nameMatch) {
                vramSize = nameMatch[1];
            }
        }

        // Get memory type (GDDR6, GDDR6X, GDDR7, etc.) from various sources
        if (gpu.memoryType) {
            memoryType = gpu.memoryType;
        } else if (specs.memoryType) {
            memoryType = specs.memoryType;
        } else if (gpu.memory && typeof gpu.memory === 'object' && gpu.memory.type) {
            memoryType = gpu.memory.type;
        }

        // Build VRAM display string
        let vram = '';
        if (vramSize) {
            // Ensure vramSize has GB suffix
            const sizeStr = vramSize.toString().toUpperCase().includes('GB') ? vramSize : `${vramSize}GB`;
            if (memoryType) {
                vram = `${sizeStr} ${memoryType}`;
            } else {
                vram = sizeStr;
            }
        }

        // Store the selected GPU for comparison
        this.selectedScatterGpu = gpu;

        // Style it exactly like component details panel - show title box even if no image
        let html = `
            <div class="image-title-box">
                <div class="title-box-text">${name}</div>
            </div>
        `;

        if (imageUrl) {
            html += `
                <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer" class="detail-product-link">
                    <div class="detail-image-container">
                        <img src="${imageUrl}" alt="${name}" class="detail-image" data-tooltip-text="${name}" onerror="this.parentElement.innerHTML='<div class=\\'detail-image-placeholder\\'><i class=\\'fas fa-image\\' style=\\'font-size: 48px; color: #ccc;\\'></i></div>'">
                        <div class="image-manufacturer-badge" style="background: linear-gradient(135deg, ${manufacturerColor} 0%, ${manufacturerColor.replace('0.95', '0.85')} 100%);">${manufacturer}</div>
                        ${vram ? `
                            <div class="image-vram-overlay">
                                <div class="overlay-vram-text">${vram}</div>
                            </div>
                        ` : ''}
                        ${isOnSale ? `
                            <div class="image-price-overlay">
                                <div class="overlay-sale-price">$${salePrice.toFixed(2)}</div>
                                <div class="overlay-original-price">$${basePrice.toFixed(2)}</div>
                                <div class="overlay-discount" style="background: ${this.getDiscountColor(discount)}">${discount}% OFF</div>
                            </div>
                        ` : `
                            <div class="image-price-overlay">
                                <div class="overlay-current-price">$${currentPrice.toFixed(2)}</div>
                            </div>
                        `}
                    </div>
                </a>
            `;
        } else {
            html += `<p style="color: #999; font-style: italic; text-align: center; padding: 20px;">No image available</p>`;
        }

        // Add compare button
        html += `
            <button class="select-component-btn" onclick="pcBuilder.compareToSimilarGPUs()" style="width: 100%; margin-top: 15px;">
                <i class="fas fa-chart-line"></i> Compare to Similar GPUs
            </button>
        `;

        container.innerHTML = html;

        // Initialize tooltip for the image
        this.initializeImageTooltip();

        // Scroll to show the selected GPU
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    renderSelectedRamFromScatter(ram) {
        const container = document.getElementById('selectedGpuFromScatter');
        const summary = document.getElementById('statisticsSummary');

        if (!container) return;

        // Hide the statistics summary
        if (summary) {
            summary.style.display = 'none';
        }

        const name = ram.title || ram.name || 'Unknown RAM';
        const imageUrl = ram.imageUrl || ram.image || '';
        const sourceUrl = ram.sourceUrl || ram.url || '#';
        const manufacturer = ram.manufacturer || 'Unknown';

        console.log('Rendering RAM:', { name, imageUrl, sourceUrl });

        const basePrice = parseFloat(ram.basePrice) || 0;
        const salePrice = parseFloat(ram.salePrice) || basePrice;
        const currentPrice = parseFloat(ram.currentPrice) || salePrice;
        const isOnSale = salePrice < basePrice && salePrice > 0;
        const discount = isOnSale ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0;

        // Determine manufacturer color
        const manufacturerLower = manufacturer.toLowerCase();
        let manufacturerColor = 'rgba(37, 99, 235, 0.95)'; // default purple

        // Get RAM specs
        const memoryType = ram.memoryType || 'Unknown';
        const speed = ram.speed || 'Unknown';
        const capacity = ram.kitConfiguration || (ram.kitSize && ram.capacity ? `${ram.kitSize}x${ram.capacity}GB` : 'Unknown');
        const totalCapacity = ram.totalCapacity || (ram.kitSize && ram.capacity ? ram.kitSize * ram.capacity : 0);

        // Store the selected RAM for comparison
        this.selectedScatterRam = ram;

        // Check RAM compatibility with selected motherboard
        let isRamCompatible = true;
        let incompatibilityMessage = '';
        if (this.currentBuild && this.currentBuild.motherboard) {
            const selectedMotherboard = this.currentBuild.motherboard;
            const motherboardMemoryTypes = selectedMotherboard.memoryType || [];
            const ramMemoryType = ram.memoryType;

            // Ensure motherboardMemoryTypes is an array
            const memoryTypesArray = Array.isArray(motherboardMemoryTypes) ? motherboardMemoryTypes : [motherboardMemoryTypes];

            if (memoryTypesArray.length > 0 && ramMemoryType) {
                const normalizedRamType = ramMemoryType.toString().trim().toUpperCase();

                // Check if RAM type matches any of the motherboard's supported types
                isRamCompatible = memoryTypesArray.some(mbType => {
                    const normalizedMbType = mbType.toString().trim().toUpperCase();
                    return normalizedRamType.includes(normalizedMbType) || normalizedMbType.includes(normalizedRamType);
                });

                if (!isRamCompatible) {
                    const mbTypesStr = memoryTypesArray.join('/');
                    incompatibilityMessage = `⚠️ Incompatible with selected motherboard (${mbTypesStr} required, this RAM is ${ramMemoryType})`;
                }
            }
        }

        // Style it exactly like component details panel
        let html = `
            <div class="image-title-box ${!isRamCompatible ? 'incompatible-component' : ''}">
                <div class="title-box-text">${name}</div>
            </div>
        `;

        if (imageUrl) {
            html += `
                <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer" class="detail-product-link ${!isRamCompatible ? 'incompatible-component' : ''}">
                    <div class="detail-image-container ${!isRamCompatible ? 'incompatible-component' : ''}">
                        <img src="${imageUrl}" alt="${name}" class="detail-image" data-tooltip-text="${name}" onerror="this.parentElement.innerHTML='<div class=\\'detail-image-placeholder\\'><i class=\\'fas fa-image\\' style=\\'font-size: 48px; color: #ccc;\\'></i></div>'">
                        <div class="image-manufacturer-badge" style="background: linear-gradient(135deg, ${manufacturerColor} 0%, ${manufacturerColor.replace('0.95', '0.85')} 100%);">${manufacturer}</div>
                        ${!isRamCompatible ? `
                            <div class="image-incompatibility-overlay">
                                <div class="incompatibility-warning-badge">
                                    ${incompatibilityMessage}
                                </div>
                            </div>
                        ` : ''}
                        <div class="image-vram-overlay">
                            <div class="overlay-vram-text">${memoryType} ${capacity} @ ${speed}</div>
                        </div>
                        ${isOnSale ? `
                            <div class="image-price-overlay">
                                <div class="overlay-sale-price">$${salePrice.toFixed(2)}</div>
                                <div class="overlay-original-price">$${basePrice.toFixed(2)}</div>
                                <div class="overlay-discount" style="background: ${this.getDiscountColor(discount)}">${discount}% OFF</div>
                            </div>
                        ` : `
                            <div class="image-price-overlay">
                                <div class="overlay-current-price">$${currentPrice.toFixed(2)}</div>
                            </div>
                        `}
                    </div>
                </a>
            `;
        } else {
            html += `<p style="color: #999; font-style: italic; text-align: center; padding: 20px;">No image available</p>`;
        }

        // Add compare button with incompatibility styling if needed
        html += `
            <button class="select-component-btn ${!isRamCompatible ? 'incompatible-button' : ''}" onclick="pcBuilder.compareToSimilarRAM()" style="width: 100%; margin-top: 15px;">
                <i class="fas ${!isRamCompatible ? 'fa-exclamation-triangle' : 'fa-chart-line'}"></i> Compare to Similar RAM
            </button>
        `;

        container.innerHTML = html;

        // Initialize tooltip for the image
        this.initializeImageTooltip();

        // Scroll to show the selected RAM
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    renderSelectedStorageFromScatter(storage) {
        const container = document.getElementById('selectedGpuFromScatter');
        const summary = document.getElementById('statisticsSummary');

        if (!container) return;

        // Hide the statistics summary
        if (summary) {
            summary.style.display = 'none';
        }

        const name = storage.title || storage.name || 'Unknown Storage';
        const imageUrl = storage.imageUrl || storage.image || '';
        const sourceUrl = storage.sourceUrl || storage.url || '#';
        const manufacturer = storage.manufacturer || 'Unknown';

        console.log('Rendering Storage:', { name, imageUrl, sourceUrl });

        const basePrice = parseFloat(storage.basePrice) || 0;
        const salePrice = parseFloat(storage.salePrice) || basePrice;
        const currentPrice = parseFloat(storage.currentPrice) || salePrice;
        const isOnSale = salePrice < basePrice && salePrice > 0;
        const discount = isOnSale ? Math.round(((basePrice - salePrice) / basePrice) * 100) : 0;

        // Determine manufacturer color
        const manufacturerLower = manufacturer.toLowerCase();
        let manufacturerColor = 'rgba(37, 99, 235, 0.95)'; // default purple

        // Get Storage specs
        const storageType = storage.storageType || 'Unknown';
        const capacity = storage.capacity || 'Unknown';
        const interfaceType = storage.interfaceType || '';

        // Store the selected Storage for comparison
        this.selectedScatterStorage = storage;

        // Style it exactly like component details panel
        let html = `
            <div class="image-title-box">
                <div class="title-box-text">${name}</div>
            </div>
        `;

        if (imageUrl) {
            html += `
                <a href="${sourceUrl}" target="_blank" rel="noopener noreferrer" class="detail-product-link">
                    <div class="detail-image-container">
                        <img src="${imageUrl}" alt="${name}" class="detail-image" data-tooltip-text="${name}" onerror="this.parentElement.innerHTML='<div class=\\'detail-image-placeholder\\'><i class=\\'fas fa-image\\' style=\\'font-size: 48px; color: #ccc;\\'></i></div>'">
                        <div class="image-manufacturer-badge" style="background: linear-gradient(135deg, ${manufacturerColor} 0%, ${manufacturerColor.replace('0.95', '0.85')} 100%);">${manufacturer}</div>
                        <div class="image-vram-overlay">
                            <div class="overlay-vram-text">${storageType} ${capacity}${interfaceType ? ' - ' + interfaceType : ''}</div>
                        </div>
                        ${isOnSale ? `
                            <div class="image-price-overlay">
                                <div class="overlay-sale-price">$${salePrice.toFixed(2)}</div>
                                <div class="overlay-original-price">$${basePrice.toFixed(2)}</div>
                                <div class="overlay-discount" style="background: ${this.getDiscountColor(discount)}">${discount}% OFF</div>
                            </div>
                        ` : `
                            <div class="image-price-overlay">
                                <div class="overlay-current-price">$${currentPrice.toFixed(2)}</div>
                            </div>
                        `}
                    </div>
                </a>
            `;
        } else {
            html += `<p style="color: #999; font-style: italic; text-align: center; padding: 20px;">No image available</p>`;
        }

        // Add compare button
        html += `
            <button class="select-component-btn" onclick="pcBuilder.compareToSimilarStorage()" style="width: 100%; margin-top: 15px;">
                <i class="fas fa-chart-line"></i> Compare to Similar Storage
            </button>
        `;

        container.innerHTML = html;

        // Initialize tooltip for the image
        this.initializeImageTooltip();

        // Scroll to show the selected Storage
        container.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    async compareToSimilarGPUs() {
        if (!this.selectedScatterGpu) return;

        const selectedGpu = this.selectedScatterGpu;
        const selectedPerformance = this.getGpuPerformance(selectedGpu);
        const selectedPrice = parseFloat(selectedGpu.salePrice) || parseFloat(selectedGpu.currentPrice) || parseFloat(selectedGpu.basePrice) || 0;

        if (selectedPerformance === null || selectedPrice <= 0) {
            console.error('Selected GPU has invalid performance or price');
            return;
        }

        // Fetch all individual GPUs if not already loaded
        let allIndividualGPUs = [];
        try {
            const response = await fetch('/api/parts/gpus?groupByModel=false');
            if (!response.ok) {
                throw new Error(`Failed to fetch individual GPUs: ${response.status}`);
            }
            allIndividualGPUs = await response.json();
        } catch (error) {
            console.error('Error fetching individual GPUs:', error);
            return;
        }

        // Calculate similarity score for each GPU
        const similarGpus = allIndividualGPUs
            .filter(gpu => {
                // Exclude the selected GPU itself
                if (gpu._id && selectedGpu._id && gpu._id.toString() === selectedGpu._id.toString()) {
                    return false;
                }
                const performance = this.getGpuPerformance(gpu);
                const price = parseFloat(gpu.salePrice) || parseFloat(gpu.currentPrice) || parseFloat(gpu.basePrice) || 0;
                return performance !== null && price > 0;
            })
            .map(gpu => {
                const performance = this.getGpuPerformance(gpu);
                const price = parseFloat(gpu.salePrice) || parseFloat(gpu.currentPrice) || parseFloat(gpu.basePrice) || 0;

                // Calculate normalized distance in performance-price space
                // Normalize by the selected GPU's values to get relative differences
                const perfDiff = Math.abs(performance - selectedPerformance) / selectedPerformance;
                const priceDiff = Math.abs(price - selectedPrice) / selectedPrice;

                // Combined similarity score (lower is more similar)
                const similarityScore = Math.sqrt(perfDiff * perfDiff + priceDiff * priceDiff);

                return {
                    gpu: gpu,
                    similarityScore: similarityScore,
                    performance: performance,
                    price: price
                };
            })
            .sort((a, b) => a.similarityScore - b.similarityScore)
            .slice(0, 4) // Get top 4 most similar
            .map(item => item.gpu);

        console.log(`Found ${similarGpus.length} similar GPUs to compare with`);

        // Close statistics panel and open component details with comparison
        this.closeStatisticsPanel();

        // Set up comparison with selected GPU and 4 similar ones
        // Store them in the format expected by showDetailsPanel
        this.comparisonComponents = [
            { component: selectedGpu, componentType: 'gpu', variantIndex: 0 },
            ...similarGpus.map((gpu, idx) => ({ component: gpu, componentType: 'gpu', variantIndex: idx + 1 }))
        ];
        this.currentComparisonIndex = 0;

        // Store current selection for the "Add to Build" button
        this.currentDetailSelection = { component: selectedGpu, componentType: 'gpu', variantIndex: 0 };

        // Show the component details panel
        const detailsPanel = document.getElementById('componentDetailsPanel');
        if (detailsPanel) {
            detailsPanel.classList.remove('hidden');
        }

        // Create mobile toggle button if on mobile
        this.createMobileDetailsToggle();

        // Render the comparison details
        this.renderComparisonView();

        // Now expand the relevant GPU model rows in the modal table
        // Wait a moment for the modal table to be populated
        setTimeout(() => {
            this.expandAndSelectGPUsInModal([selectedGpu, ...similarGpus]);
        }, 500);
    }

    async compareToSimilarCPUs() {
        if (!this.selectedScatterCpu) return;

        const selectedCpu = this.selectedScatterCpu;
        const selectedPerformance = this.getCpuPerformance(selectedCpu);
        const selectedPrice = parseFloat(selectedCpu.salePrice) || parseFloat(selectedCpu.currentPrice) || parseFloat(selectedCpu.basePrice) || 0;

        if (selectedPerformance === null || selectedPrice <= 0) {
            console.error('Selected CPU has invalid performance or price');
            return;
        }

        // Fetch all individual CPUs
        let allIndividualCPUs = [];
        try {
            const response = await fetch('/api/parts/cpus');
            if (!response.ok) {
                throw new Error(`Failed to fetch individual CPUs: ${response.status}`);
            }
            allIndividualCPUs = await response.json();
        } catch (error) {
            console.error('Error fetching individual CPUs:', error);
            return;
        }

        // Calculate similarity score for each CPU
        const similarCpus = allIndividualCPUs
            .filter(cpu => {
                // Exclude the selected CPU itself
                if (cpu._id && selectedCpu._id && cpu._id.toString() === selectedCpu._id.toString()) {
                    return false;
                }
                const performance = this.getCpuPerformance(cpu);
                const price = parseFloat(cpu.salePrice) || parseFloat(cpu.currentPrice) || parseFloat(cpu.basePrice) || 0;
                return performance !== null && price > 0;
            })
            .map(cpu => {
                const performance = this.getCpuPerformance(cpu);
                const price = parseFloat(cpu.salePrice) || parseFloat(cpu.currentPrice) || parseFloat(cpu.basePrice) || 0;

                // Calculate normalized distance in performance-price space
                // Normalize by the selected CPU's values to get relative differences
                const perfDiff = Math.abs(performance - selectedPerformance) / selectedPerformance;
                const priceDiff = Math.abs(price - selectedPrice) / selectedPrice;

                // Combined similarity score (lower is more similar)
                const similarityScore = Math.sqrt(perfDiff * perfDiff + priceDiff * priceDiff);

                return {
                    cpu: cpu,
                    similarityScore: similarityScore,
                    performance: performance,
                    price: price
                };
            })
            .sort((a, b) => a.similarityScore - b.similarityScore)
            .slice(0, 4) // Get top 4 most similar
            .map(item => item.cpu);

        console.log(`Found ${similarCpus.length} similar CPUs to compare with`);

        // Close statistics panel and open component details with comparison
        this.closeStatisticsPanel();

        // Set up comparison with selected CPU and 4 similar ones
        // Store them in the format expected by showDetailsPanel
        this.comparisonComponents = [
            { component: selectedCpu, componentType: 'cpu', variantIndex: 0 },
            ...similarCpus.map((cpu, idx) => ({ component: cpu, componentType: 'cpu', variantIndex: idx + 1 }))
        ];
        this.currentComparisonIndex = 0;

        // Store current selection for the "Add to Build" button
        this.currentDetailSelection = { component: selectedCpu, componentType: 'cpu', variantIndex: 0 };

        // Show the component details panel
        const detailsPanel = document.getElementById('componentDetailsPanel');
        if (detailsPanel) {
            detailsPanel.classList.remove('hidden');
        }

        // Create mobile toggle button if on mobile
        this.createMobileDetailsToggle();

        // Render the comparison details
        this.renderComparisonView();
    }

    async compareToSimilarRAM() {
        if (!this.selectedScatterRam) return;

        const selectedRam = this.selectedScatterRam;
        const selectedCapacity = selectedRam.totalCapacity || (selectedRam.kitSize && selectedRam.capacity ? selectedRam.kitSize * selectedRam.capacity : 0);
        const selectedPrice = parseFloat(selectedRam.salePrice) || parseFloat(selectedRam.currentPrice) || parseFloat(selectedRam.basePrice) || 0;

        if (selectedCapacity <= 0 || selectedPrice <= 0) {
            console.error('Selected RAM has invalid capacity or price');
            return;
        }

        // Fetch all individual RAM modules
        let allIndividualRAM = [];
        try {
            const response = await fetch('/api/parts/rams');
            if (!response.ok) {
                throw new Error(`Failed to fetch individual RAM: ${response.status}`);
            }
            allIndividualRAM = await response.json();
        } catch (error) {
            console.error('Error fetching individual RAM:', error);
            return;
        }

        // Calculate similarity score for each RAM
        const similarRam = allIndividualRAM
            .filter(ram => {
                // Exclude the selected RAM itself
                if (ram._id && selectedRam._id && ram._id.toString() === selectedRam._id.toString()) {
                    return false;
                }
                const capacity = ram.totalCapacity || (ram.kitSize && ram.capacity ? ram.kitSize * ram.capacity : 0);
                const price = parseFloat(ram.salePrice) || parseFloat(ram.currentPrice) || parseFloat(ram.basePrice) || 0;
                return capacity > 0 && price > 0;
            })
            .map(ram => {
                const capacity = ram.totalCapacity || (ram.kitSize && ram.capacity ? ram.kitSize * ram.capacity : 0);
                const price = parseFloat(ram.salePrice) || parseFloat(ram.currentPrice) || parseFloat(ram.basePrice) || 0;

                // Calculate normalized distance in capacity-price space
                // Normalize by the selected RAM's values to get relative differences
                const capacityDiff = Math.abs(capacity - selectedCapacity) / selectedCapacity;
                const priceDiff = Math.abs(price - selectedPrice) / selectedPrice;

                // Combined similarity score (lower is more similar)
                const similarityScore = Math.sqrt(capacityDiff * capacityDiff + priceDiff * priceDiff);

                return {
                    ram: ram,
                    similarityScore: similarityScore,
                    capacity: capacity,
                    price: price
                };
            })
            .sort((a, b) => a.similarityScore - b.similarityScore)
            .slice(0, 4) // Get top 4 most similar
            .map(item => item.ram);

        console.log(`Found ${similarRam.length} similar RAM modules to compare with`);

        // Close statistics panel and open component details with comparison
        this.closeStatisticsPanel();

        // Set up comparison with selected RAM and 4 similar ones
        this.comparisonComponents = [
            { component: selectedRam, componentType: 'ram', variantIndex: 0 },
            ...similarRam.map((ram, idx) => ({ component: ram, componentType: 'ram', variantIndex: idx + 1 }))
        ];
        this.currentComparisonIndex = 0;

        // Store current selection for the "Add to Build" button
        this.currentDetailSelection = { component: selectedRam, componentType: 'ram', variantIndex: 0 };

        // Show the component details panel
        const detailsPanel = document.getElementById('componentDetailsPanel');
        if (detailsPanel) {
            detailsPanel.classList.remove('hidden');
        }

        // Create mobile toggle button if on mobile
        this.createMobileDetailsToggle();

        // Render the comparison details
        this.renderComparisonView();
    }

    async compareToSimilarStorage() {
        if (!this.selectedScatterStorage) return;

        const selectedStorage = this.selectedScatterStorage;
        const selectedCapacity = parseFloat(selectedStorage.capacityGB) || 0;
        const selectedPrice = parseFloat(selectedStorage.salePrice) || parseFloat(selectedStorage.currentPrice) || parseFloat(selectedStorage.basePrice) || 0;

        if (selectedCapacity <= 0 || selectedPrice <= 0) {
            console.error('Selected Storage has invalid capacity or price');
            return;
        }

        // Fetch all individual Storage devices
        let allIndividualStorage = [];
        try {
            const response = await fetch('/api/parts/storages');
            if (!response.ok) {
                throw new Error(`Failed to fetch individual Storage: ${response.status}`);
            }
            allIndividualStorage = await response.json();
        } catch (error) {
            console.error('Error fetching individual Storage:', error);
            return;
        }

        // Calculate similarity score for each Storage device
        const similarStorage = allIndividualStorage
            .filter(storage => {
                // Exclude the selected Storage itself
                if (storage._id && selectedStorage._id && storage._id.toString() === selectedStorage._id.toString()) {
                    return false;
                }
                const capacity = parseFloat(storage.capacityGB) || 0;
                const price = parseFloat(storage.salePrice) || parseFloat(storage.currentPrice) || parseFloat(storage.basePrice) || 0;
                return capacity > 0 && price > 0;
            })
            .map(storage => {
                const capacity = parseFloat(storage.capacityGB) || 0;
                const price = parseFloat(storage.salePrice) || parseFloat(storage.currentPrice) || parseFloat(storage.basePrice) || 0;

                // Calculate normalized distance in capacity-price space
                // Normalize by the selected Storage's values to get relative differences
                const capacityDiff = Math.abs(capacity - selectedCapacity) / selectedCapacity;
                const priceDiff = Math.abs(price - selectedPrice) / selectedPrice;

                // Combined similarity score (lower is more similar)
                const similarityScore = Math.sqrt(capacityDiff * capacityDiff + priceDiff * priceDiff);

                return {
                    storage: storage,
                    similarityScore: similarityScore,
                    capacity: capacity,
                    price: price
                };
            })
            .sort((a, b) => a.similarityScore - b.similarityScore)
            .slice(0, 4) // Get top 4 most similar
            .map(item => item.storage);

        console.log(`Found ${similarStorage.length} similar Storage devices to compare with`);

        // Close statistics panel and open component details with comparison
        this.closeStatisticsPanel();

        // Set up comparison with selected Storage and 4 similar ones
        this.comparisonComponents = [
            { component: selectedStorage, componentType: 'storage', variantIndex: 0 },
            ...similarStorage.map((storage, idx) => ({ component: storage, componentType: 'storage', variantIndex: idx + 1 }))
        ];
        this.currentComparisonIndex = 0;

        // Store current selection for the "Add to Build" button
        this.currentDetailSelection = { component: selectedStorage, componentType: 'storage', variantIndex: 0 };

        // Show the component details panel
        const detailsPanel = document.getElementById('componentDetailsPanel');
        if (detailsPanel) {
            detailsPanel.classList.remove('hidden');
        }

        // Create mobile toggle button if on mobile
        this.createMobileDetailsToggle();

        // Render the comparison details
        this.renderComparisonView();
    }

    extractGPUModelName(title) {
        if (!title) return 'Unknown';

        const titleUpper = title.toUpperCase();

        // Use [^\d]* instead of \s* to handle special chars like ™ ® between prefix and model number
        // Use [^\w]* for gaps between model number and suffixes (Ti, Super, XT, XTX, GRE)

        // NVIDIA RTX patterns - check for Ti and Super variants first (more specific)
        // Check RTX with Ti Super
        if (/RTX[^\d]*\d{4}[^\w]*TI[^\w]*SUPER/i.test(titleUpper)) {
            const match = titleUpper.match(/RTX[^\d]*(\d{4})[^\w]*TI[^\w]*SUPER/i);
            if (match) return `RTX ${match[1]} Ti Super`;
        }
        // Check RTX with Ti
        if (/RTX[^\d]*\d{4}[^\w]*TI/i.test(titleUpper)) {
            const match = titleUpper.match(/RTX[^\d]*(\d{4})[^\w]*TI/i);
            if (match) return `RTX ${match[1]} Ti`;
        }
        // Check RTX with Super
        if (/RTX[^\d]*\d{4}[^\w]*SUPER/i.test(titleUpper)) {
            const match = titleUpper.match(/RTX[^\d]*(\d{4})[^\w]*SUPER/i);
            if (match) return `RTX ${match[1]} Super`;
        }
        // Check regular RTX
        if (/RTX[^\d]*\d{4}/.test(titleUpper)) {
            const match = titleUpper.match(/RTX[^\d]*(\d{4})/);
            if (match) return `RTX ${match[1]}`;
        }

        // NVIDIA GTX patterns
        if (/GTX[^\d]*\d{4}[^\w]*TI/i.test(titleUpper)) {
            const match = titleUpper.match(/GTX[^\d]*(\d{4})[^\w]*TI/i);
            if (match) return `GTX ${match[1]} Ti`;
        }
        if (/GTX[^\d]*\d{4}/.test(titleUpper)) {
            const match = titleUpper.match(/GTX[^\d]*(\d{4})/);
            if (match) return `GTX ${match[1]}`;
        }

        // AMD RX patterns - check XTX before XT, then GRE (more specific first)
        if (/RX[^\d]*\d{4}[^\w]*XTX/i.test(titleUpper)) {
            const match = titleUpper.match(/RX[^\d]*(\d{4})[^\w]*XTX/i);
            if (match) return `RX ${match[1]} XTX`;
        }
        if (/RX[^\d]*\d{4}[^\w]*GRE/i.test(titleUpper)) {
            const match = titleUpper.match(/RX[^\d]*(\d{4})[^\w]*GRE/i);
            if (match) return `RX ${match[1]} GRE`;
        }
        if (/RX[^\d]*\d{4}[^\w]*XT/i.test(titleUpper)) {
            const match = titleUpper.match(/RX[^\d]*(\d{4})[^\w]*XT/i);
            if (match) return `RX ${match[1]} XT`;
        }
        if (/RX[^\d]*\d{4}/.test(titleUpper)) {
            const match = titleUpper.match(/RX[^\d]*(\d{4})/);
            if (match) return `RX ${match[1]}`;
        }

        // Intel Arc patterns
        const arcMatch = titleUpper.match(/ARC[^\w]*([A-Z]\d{3})/i);
        if (arcMatch) {
            return `Arc ${arcMatch[1]}`;
        }

        return title;
    }

    async expandAndSelectGPUsInModal(gpus) {
        // Get all GPU models from the comparison GPUs
        const gpuModelsToExpand = new Set();
        const gpuIdsToSelect = new Set();

        gpus.forEach(gpu => {
            // Extract model name (e.g., "RTX 3090" from full title)
            const fullTitle = gpu.title || gpu.name || '';
            const model = this.extractGPUModelName(fullTitle);
            gpuModelsToExpand.add(model);
            gpuIdsToSelect.add(gpu._id ? gpu._id.toString() : fullTitle);
        });

        console.log('Models to expand:', Array.from(gpuModelsToExpand));
        console.log('GPU IDs to select:', Array.from(gpuIdsToSelect));

        // Find all main rows in the component table
        const tableBody = document.getElementById('componentTableBody');
        if (!tableBody) {
            console.error('Component table body not found');
            return;
        }

        const mainRows = tableBody.querySelectorAll('tr.component-main-row');

        for (const row of mainRows) {
            // Get the component name from the row
            const nameCell = row.querySelector('td:first-child');
            if (!nameCell) continue;

            const rowText = nameCell.textContent.trim();

            // Extract the model name from the row text for exact matching
            const rowModelName = this.extractGPUModelName(rowText);

            // Check if this row matches any of our GPU models using exact matching
            let shouldExpand = false;
            for (const model of gpuModelsToExpand) {
                if (rowModelName === model) {
                    shouldExpand = true;
                    console.log('Row model', rowModelName, 'matches target model', model);
                    break;
                }
            }

            if (shouldExpand) {
                // Check if already expanded
                const expandIcon = row.querySelector('.expand-icon');
                if (expandIcon && !expandIcon.classList.contains('fa-chevron-down')) {
                    // Not expanded yet, manually trigger expansion WITHOUT auto-selecting all variants
                    console.log('Expanding row:', rowText);

                    // Find the matching component from allGPUs by exact model name match
                    let component = null;
                    let componentIndex = -1;

                    // Extract the model name from the row text
                    const rowModelName = this.extractGPUModelName(rowText);

                    for (let i = 0; i < this.allGPUs.length; i++) {
                        const gpu = this.allGPUs[i];
                        const gpuName = gpu.name || gpu.title || '';
                        const gpuModelName = this.extractGPUModelName(gpuName);

                        // Check if GPU model matches exactly
                        if (gpuModelName === rowModelName) {
                            component = gpu;
                            componentIndex = i;
                            console.log('Found matching component:', gpuName, '(model:', gpuModelName, ') for row:', rowText, '(model:', rowModelName, ')');
                            break;
                        }
                    }

                    if (component) {
                        await this.toggleComponentVariants(row, component, 'gpu', componentIndex, false); // false = don't auto-select
                        await new Promise(resolve => setTimeout(resolve, 300));
                    } else {
                        console.error('Could not find matching component for row:', rowText);
                    }
                }
            }
        }

        // After expanding, find and select the specific variants
        setTimeout(() => {
            console.log('Looking for variant cards to select...');
            const variantCards = tableBody.querySelectorAll('.variant-card');
            console.log(`Found ${variantCards.length} total variant cards`);

            variantCards.forEach(card => {
                // Check if this card matches one of our comparison GPUs
                const variantTitle = card.querySelector('.variant-name')?.textContent || '';
                const variantId = card.getAttribute('data-variant-id');

                // Check if this variant should be selected
                let matchingGpu = null;
                gpus.forEach(gpu => {
                    const gpuTitle = gpu.title || gpu.name || '';
                    const gpuId = gpu._id ? gpu._id.toString() : gpuTitle;

                    // Match by title or ID
                    if (variantTitle.includes(gpuTitle) || gpuTitle.includes(variantTitle) || variantId === gpuId) {
                        matchingGpu = gpu;
                    }
                });

                if (matchingGpu) {
                    console.log('Found matching variant:', variantTitle, 'for GPU:', matchingGpu.title || matchingGpu.name);

                    // Add visual styling directly
                    card.classList.add('variant-selected');

                    // Add selection indicator if not present
                    if (!card.querySelector('.selection-indicator')) {
                        const indicator = document.createElement('div');
                        indicator.className = 'selection-indicator';
                        indicator.innerHTML = '<i class="fas fa-check-circle"></i>';
                        card.appendChild(indicator);
                    }
                }
            });

            console.log('Finished marking variants as selected');
        }, 1000);
    }

    closeComponentModal() {
        document.getElementById('componentSelectorModal').style.display = 'none';
        this.currentModalType = '';
        this.modalContext = null; // Reset modal context

        // Cancel any pending data-wait retry
        if (this._modalRetryTimer) {
            clearInterval(this._modalRetryTimer);
            this._modalRetryTimer = null;
        }

        // Reset price filters
        this.minPrice = null;
        this.maxPrice = null;
        const minPriceInput = document.getElementById('minPriceInput');
        const maxPriceInput = document.getElementById('maxPriceInput');
        if (minPriceInput) minPriceInput.value = '';
        if (maxPriceInput) maxPriceInput.value = '';

        // Also close the details panel when closing the modal
        this.closeDetailsPanel();
        this.closeStatisticsPanel();
    }
}

// Global variable to access the PartsDatabase instance
let pcBuilder;

// Global function to close the modal (called from HTML onclick)
function closeComponentModal() {
    if (pcBuilder) {
        pcBuilder.closeComponentModal();
    }
}

// Global function to toggle CPU performance mode (called from HTML onclick)
function toggleCpuPerformanceMode() {
    if (pcBuilder) {
        pcBuilder.toggleCpuPerformanceMode();
    }
}

// Particle System for Background Animation
class ParticleSystem {
    constructor() {
        this.canvas = document.getElementById('particles-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.particleCount = 50;
        this.resize();
        this.createParticles();
        this.animate();

        window.addEventListener('resize', () => this.resize());
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    createParticles() {
        for (let i = 0; i < this.particleCount; i++) {
            this.particles.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                size: Math.random() * 3 + 1,
                speedX: (Math.random() - 0.5) * 0.5,
                speedY: (Math.random() - 0.5) * 0.5,
                opacity: Math.random() * 0.5 + 0.2
            });
        }
    }

    animate() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        this.particles.forEach(particle => {
            // Update position
            particle.x += particle.speedX;
            particle.y += particle.speedY;

            // Wrap around screen edges
            if (particle.x < 0) particle.x = this.canvas.width;
            if (particle.x > this.canvas.width) particle.x = 0;
            if (particle.y < 0) particle.y = this.canvas.height;
            if (particle.y > this.canvas.height) particle.y = 0;

            // Draw particle
            this.ctx.beginPath();
            this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
            this.ctx.fillStyle = `rgba(96, 165, 250, ${particle.opacity})`;
            this.ctx.fill();
        });

        // Draw connections between nearby particles
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const dx = this.particles[i].x - this.particles[j].x;
                const dy = this.particles[i].y - this.particles[j].y;
                const distance = Math.sqrt(dx * dx + dy * dy);

                if (distance < 150) {
                    this.ctx.beginPath();
                    this.ctx.strokeStyle = `rgba(96, 165, 250, ${0.15 * (1 - distance / 150)})`;
                    this.ctx.lineWidth = 1;
                    this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
                    this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
                    this.ctx.stroke();
                }
            }
        }

        requestAnimationFrame(() => this.animate());
    }
}

// Initialize the parts database frontend when the page loads
document.addEventListener('DOMContentLoaded', () => {
    pcBuilder = new PartsDatabase();
    window.partsDatabase = pcBuilder; // Make it globally accessible

    // Detect mobile device and override layout mode
    const isMobileOrTablet = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth <= 1024;
    if (isMobileOrTablet) {
        pcBuilder.layoutMode = 'single';
        console.log('Mobile/Tablet device detected - forcing single column layout');
    }

    // Apply layout mode class to component-selectors
    const componentSelectors = document.querySelector('.component-selectors');
    if (componentSelectors) {
        switch (pcBuilder.layoutMode) {
            case 'single':
                componentSelectors.classList.add('layout-single');
                componentSelectors.classList.remove('layout-double');
                console.log('Applied single column layout');
                break;
            case 'double':
                componentSelectors.classList.add('layout-double');
                componentSelectors.classList.remove('layout-single');
                console.log('Applied double column layout');
                break;
            default:
                console.warn('Unknown layout mode:', pcBuilder.layoutMode);
                // Default to single column
                componentSelectors.classList.add('layout-single');
                componentSelectors.classList.remove('layout-double');
        }
    }

    // Initialize particle system
    new ParticleSystem();

    // Debug: Check initial window dimensions
    console.log(`=== PAGE LOAD DEBUG ===`);
    console.log(`Window dimensions: ${window.innerWidth}x${window.innerHeight}`);
    console.log(`Screen dimensions: ${screen.width}x${screen.height}`);
    console.log(`Device pixel ratio: ${window.devicePixelRatio}`);
    console.log(`Is mobile (≤1200px): ${window.innerWidth <= 1200}`);

    // Immediately apply mobile grid if needed - multiple attempts
    const applyMobileGrid = () => {
        const partsGrid = document.getElementById('partsGrid');
        const title = document.querySelector('header h1');
        console.log(`Grid setup attempt - partsGrid exists: ${!!partsGrid}, title exists: ${!!title}`);
        if (partsGrid) {
            const isMobile = window.innerWidth <= 1200;
            const currentStyle = window.getComputedStyle(partsGrid).gridTemplateColumns;
            console.log(`  Current grid-template-columns: ${currentStyle}`);
            console.log(`  Width: ${window.innerWidth}, isMobile: ${isMobile}`);
            if (isMobile) {
                // Force single column with max specificity
                partsGrid.style.setProperty('grid-template-columns', '1fr', 'important');
                partsGrid.style.setProperty('display', 'grid', 'important');
                partsGrid.classList.add('mobile-single-column');
                const newStyle = window.getComputedStyle(partsGrid).gridTemplateColumns;
                console.log(`  ✓ Applied 1fr with setProperty, new computed style: ${newStyle}`);
            } else {
                // Desktop - keep title white
                if (title) {
                    title.style.setProperty('color', 'white', 'important');
                }
                partsGrid.classList.remove('mobile-single-column');
            }
        } else {
            console.log(`  ✗ partsGrid element not found!`);
        }
    };

    setTimeout(applyMobileGrid, 500);
    setTimeout(applyMobileGrid, 1000);
    setTimeout(applyMobileGrid, 2000);
    setTimeout(applyMobileGrid, 3000);

    // Add keypress listener to show debug button when ` (backtick) is pressed
    document.addEventListener('keydown', (e) => {
        if (e.key === '`' || e.key === '~') {
            const debugBtn = document.getElementById('debugBtn');
            if (debugBtn) {
                debugBtn.style.display = 'flex';
                console.log('Debug button revealed with ` key');
            }
        }
    });

    // Add resize listener to update grid layout on mobile
    let resizeTimeout;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
            const partsGrid = document.getElementById('partsGrid');
            const title = document.querySelector('header h1');
            if (partsGrid) {
                const isMobile = window.innerWidth <= 1200;
                console.log(`Resize detected: width=${window.innerWidth}, isMobile=${isMobile}`);
                if (isMobile) {
                    partsGrid.style.setProperty('grid-template-columns', '1fr', 'important');
                    partsGrid.classList.add('mobile-single-column');
                } else {
                    partsGrid.style.gridTemplateColumns = '';
                    partsGrid.classList.remove('mobile-single-column');
                }
            }
        }, 100);
    });
});
