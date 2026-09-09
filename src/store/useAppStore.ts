import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Quote, Product, Category, TaxRate, Customer, Employee, StockMovement, CompanySettings, Reorder, Vendor, DirectSale } from '../types';

interface AppState {
  quotes: Quote[];
  products: Product[];
  categories: Category[];
  taxRates: TaxRate[];
  customers: Customer[];
  employees: Employee[];
  stockMovements: StockMovement[];
  reorders: Reorder[];
  companySettings: CompanySettings | null;
  vendors: Vendor[];
  directSales: DirectSale[];

  quotesLoaded: boolean;
  productsLoaded: boolean;
  categoriesLoaded: boolean;
  taxRatesLoaded: boolean;
  customersLoaded: boolean;
  employeesLoaded: boolean;
  stockMovementsLoaded: boolean;
  reordersLoaded: boolean;
  companySettingsLoaded: boolean;
  vendorsLoaded: boolean;
  directSalesLoaded: boolean;

  setQuotes: (quotes: Quote[]) => void;
  setProducts: (products: Product[]) => void;
  setCategories: (categories: Category[]) => void;
  setTaxRates: (taxRates: TaxRate[]) => void;
  setCustomers: (customers: Customer[]) => void;
  setEmployees: (employees: Employee[]) => void;
  setStockMovements: (stockMovements: StockMovement[]) => void;
  setReorders: (reorders: Reorder[]) => void;
  setCompanySettings: (companySettings: CompanySettings | null) => void;
  setVendors: (vendors: Vendor[]) => void;
  setDirectSales: (directSales: DirectSale[]) => void;

  setQuotesLoaded: (loaded: boolean) => void;
  setProductsLoaded: (loaded: boolean) => void;
  setCategoriesLoaded: (loaded: boolean) => void;
  setTaxRatesLoaded: (loaded: boolean) => void;
  setCustomersLoaded: (loaded: boolean) => void;
  setEmployeesLoaded: (loaded: boolean) => void;
  setStockMovementsLoaded: (loaded: boolean) => void;
  setReordersLoaded: (loaded: boolean) => void;
  setCompanySettingsLoaded: (loaded: boolean) => void;
  setVendorsLoaded: (loaded: boolean) => void;
  setDirectSalesLoaded: (loaded: boolean) => void;

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
      reorders: [],
      companySettings: null,
      vendors: [],
      directSales: [],

      quotesLoaded: false,
      productsLoaded: false,
      categoriesLoaded: false,
      taxRatesLoaded: false,
      customersLoaded: false,
      employeesLoaded: false,
      stockMovementsLoaded: false,
      reordersLoaded: false,
      companySettingsLoaded: false,
      vendorsLoaded: false,
      directSalesLoaded: false,

      setQuotes: (quotes) => set({ quotes }),
      setProducts: (products) => set({ products }),
      setCategories: (categories) => set({ categories }),
      setTaxRates: (taxRates) => set({ taxRates }),
      setCustomers: (customers) => set({ customers }),
      setEmployees: (employees) => set({ employees }),
      setStockMovements: (stockMovements) => set({ stockMovements }),
      setReorders: (reorders) => set({ reorders }),
      setCompanySettings: (companySettings) => set({ companySettings }),
      setVendors: (vendors) => set({ vendors }),
      setDirectSales: (directSales) => set({ directSales }),

      setQuotesLoaded: (quotesLoaded) => set({ quotesLoaded }),
      setProductsLoaded: (productsLoaded) => set({ productsLoaded }),
      setCategoriesLoaded: (categoriesLoaded) => set({ categoriesLoaded }),
      setTaxRatesLoaded: (taxRatesLoaded) => set({ taxRatesLoaded }),
      setCustomersLoaded: (customersLoaded) => set({ customersLoaded }),
      setEmployeesLoaded: (employeesLoaded) => set({ employeesLoaded }),
      setStockMovementsLoaded: (stockMovementsLoaded) => set({ stockMovementsLoaded }),
      setReordersLoaded: (reordersLoaded) => set({ reordersLoaded }),
      setCompanySettingsLoaded: (companySettingsLoaded) => set({ companySettingsLoaded }),
      setVendorsLoaded: (vendorsLoaded) => set({ vendorsLoaded }),
      setDirectSalesLoaded: (directSalesLoaded) => set({ directSalesLoaded }),

      clearAll: () => set({
        quotes: [],
        products: [],
        categories: [],
        taxRates: [],
        customers: [],
        employees: [],
        stockMovements: [],
        reorders: [],
        companySettings: null,
        vendors: [],
        directSales: [],
        quotesLoaded: false,
        productsLoaded: false,
        categoriesLoaded: false,
        taxRatesLoaded: false,
        customersLoaded: false,
        employeesLoaded: false,
        stockMovementsLoaded: false,
        reordersLoaded: false,
        companySettingsLoaded: false,
        vendorsLoaded: false,
        directSalesLoaded: false,
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
        reorders: state.reorders,
        companySettings: state.companySettings,
        vendors: state.vendors,
        directSales: state.directSales,
      }),
    }
  )
);
