import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Quote, Product, Category, TaxRate, Customer, Employee, StockMovement, CompanySettings } from '../types';

interface AppState {
  quotes: Quote[];
  products: Product[];
  categories: Category[];
  taxRates: TaxRate[];
  customers: Customer[];
  employees: Employee[];
  stockMovements: StockMovement[];
  companySettings: CompanySettings | null;

  quotesLoaded: boolean;
  productsLoaded: boolean;
  categoriesLoaded: boolean;
  taxRatesLoaded: boolean;
  customersLoaded: boolean;
  employeesLoaded: boolean;
  stockMovementsLoaded: boolean;
  companySettingsLoaded: boolean;

  setQuotes: (quotes: Quote[]) => void;
  setProducts: (products: Product[]) => void;
  setCategories: (categories: Category[]) => void;
  setTaxRates: (taxRates: TaxRate[]) => void;
  setCustomers: (customers: Customer[]) => void;
  setEmployees: (employees: Employee[]) => void;
  setStockMovements: (stockMovements: StockMovement[]) => void;
  setCompanySettings: (companySettings: CompanySettings | null) => void;

  setQuotesLoaded: (loaded: boolean) => void;
  setProductsLoaded: (loaded: boolean) => void;
  setCategoriesLoaded: (loaded: boolean) => void;
  setTaxRatesLoaded: (loaded: boolean) => void;
  setCustomersLoaded: (loaded: boolean) => void;
  setEmployeesLoaded: (loaded: boolean) => void;
  setStockMovementsLoaded: (loaded: boolean) => void;
  setCompanySettingsLoaded: (loaded: boolean) => void;

  clearAll: () => void;
}

// Custom storage wrapper to resolve AsyncStorage dynamically at runtime.
// This resolves timing / circular dependency initialization issues during app startup.
const customStorage = {
  getItem: async (name: string) => {
    try {
      const AsyncStorageLib = require('@react-native-async-storage/async-storage');
      const storage = AsyncStorageLib.default || AsyncStorageLib;
      return await storage.getItem(name);
    } catch (e) {
      return null;
    }
  },
  setItem: async (name: string, value: string) => {
    try {
      const AsyncStorageLib = require('@react-native-async-storage/async-storage');
      const storage = AsyncStorageLib.default || AsyncStorageLib;
      await storage.setItem(name, value);
    } catch (e) {}
  },
  removeItem: async (name: string) => {
    try {
      const AsyncStorageLib = require('@react-native-async-storage/async-storage');
      const storage = AsyncStorageLib.default || AsyncStorageLib;
      await storage.removeItem(name);
    } catch (e) {}
  }
};

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      quotes: [],
      products: [],
      categories: [],
      taxRates: [],
      customers: [],
      employees: [],
      stockMovements: [],
      companySettings: null,

      quotesLoaded: false,
      productsLoaded: false,
      categoriesLoaded: false,
      taxRatesLoaded: false,
      customersLoaded: false,
      employeesLoaded: false,
      stockMovementsLoaded: false,
      companySettingsLoaded: false,

      setQuotes: (quotes) => set({ quotes }),
      setProducts: (products) => set({ products }),
      setCategories: (categories) => set({ categories }),
      setTaxRates: (taxRates) => set({ taxRates }),
      setCustomers: (customers) => set({ customers }),
      setEmployees: (employees) => set({ employees }),
      setStockMovements: (stockMovements) => set({ stockMovements }),
      setCompanySettings: (companySettings) => set({ companySettings }),

      setQuotesLoaded: (quotesLoaded) => set({ quotesLoaded }),
      setProductsLoaded: (productsLoaded) => set({ productsLoaded }),
      setCategoriesLoaded: (categoriesLoaded) => set({ categoriesLoaded }),
      setTaxRatesLoaded: (taxRatesLoaded) => set({ taxRatesLoaded }),
      setCustomersLoaded: (customersLoaded) => set({ customersLoaded }),
      setEmployeesLoaded: (employeesLoaded) => set({ employeesLoaded }),
      setStockMovementsLoaded: (stockMovementsLoaded) => set({ stockMovementsLoaded }),
      setCompanySettingsLoaded: (companySettingsLoaded) => set({ companySettingsLoaded }),

      clearAll: () => set({
        quotes: [],
        products: [],
        categories: [],
        taxRates: [],
        customers: [],
        employees: [],
        stockMovements: [],
        companySettings: null,
        quotesLoaded: false,
        productsLoaded: false,
        categoriesLoaded: false,
        taxRatesLoaded: false,
        customersLoaded: false,
        employeesLoaded: false,
        stockMovementsLoaded: false,
        companySettingsLoaded: false,
      }),
    }),
    {
      name: 'quote-app-local-cache',
      storage: createJSONStorage(() => customStorage),
      // Only persist the actual database records, NOT the "loaded" flags
      // This forces the app to run background synchronization queries upon boot.
      partialize: (state) => ({
        quotes: state.quotes,
        products: state.products,
        categories: state.categories,
        taxRates: state.taxRates,
        customers: state.customers,
        employees: state.employees,
        stockMovements: state.stockMovements,
        companySettings: state.companySettings,
      }),
    }
  )
);
