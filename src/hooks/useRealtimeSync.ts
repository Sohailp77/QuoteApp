import { useEffect } from 'react';
import { client, DATABASE_ID, COLLECTIONS, Query, tablesDB } from '../config/appwrite';
import { useAppStore } from '../store/useAppStore';
import { useAuthStore } from '../store/useAuthStore';
import { Quote, Product, Category, TaxRate, Customer, Employee, StockMovement, CompanySettings, LineItem } from '../types';
import { animateLayout } from '../utils/animation';

export const useRealtimeSync = () => {
  const user = useAuthStore((s) => s.user);
  const store = useAppStore();

  // 1. Background sync from Appwrite on startup/login
  useEffect(() => {
    if (!user) return;

    const runBackgroundSync = async () => {
      console.log('Starting background sync for tenant:', user.tenant_id);
      try {
        // Run fetches in parallel to optimize startup time and reduce latency
        const [
          settingsRes,
          catRes,
          prodRes,
          taxRes,
          custRes,
          empRes,
          quoteRes,
          movRes
        ] = await Promise.all([
          // Settings
          tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: COLLECTIONS.COMPANY_SETTINGS,
            queries: [Query.equal('tenant_id', user.tenant_id), Query.limit(1)]
          }),
          // Categories
          tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: COLLECTIONS.CATEGORIES,
            queries: [Query.equal('tenant_id', user.tenant_id), Query.limit(100)]
          }),
          // Products
          tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: COLLECTIONS.PRODUCTS,
            queries: [Query.equal('tenant_id', user.tenant_id), Query.limit(500)]
          }),
          // Tax Rates
          tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: COLLECTIONS.TAX_RATES,
            queries: [Query.equal('tenant_id', user.tenant_id), Query.limit(100)]
          }),
          // Customers
          tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: COLLECTIONS.CUSTOMERS,
            queries: [Query.equal('tenant_id', user.tenant_id), Query.limit(100)]
          }),
          // Employees
          tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: COLLECTIONS.EMPLOYEES,
            queries: [Query.equal('tenant_id', user.tenant_id), Query.limit(100)]
          }),
          // Quotes
          tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: COLLECTIONS.QUOTES,
            queries: [
              Query.equal('tenant_id', user.tenant_id),
              Query.orderDesc('$createdAt'),
              Query.limit(200)
            ]
          }),
          // Stock Movements
          tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: COLLECTIONS.STOCK_MOVEMENTS,
            queries: [
              Query.equal('tenant_id', user.tenant_id),
              Query.orderDesc('$createdAt'),
              Query.limit(200)
            ]
          })
        ]);

        // Animate the layout transitions when loading cached/synced values
        animateLayout();

        // Company settings update
        if (settingsRes.rows.length > 0) {
          const doc = settingsRes.rows[0];
          store.setCompanySettings({
            id: doc.$id,
            tenant_id: doc.tenant_id,
            company_name: doc.company_name || '',
            email: doc.email || '',
            phone: doc.phone || '',
            website: doc.website || '',
            gst_number: doc.gst_number || '',
            address: doc.address || '',
            currency: doc.currency || '₹',
            date_format: doc.date_format || 'DD/MM/YYYY',
            invoice_prefix: doc.invoice_prefix || 'INV-',
            next_invoice_number: Number(doc.next_invoice_number) || 1,
            default_notes: doc.default_notes || '',
            terms_conditions: doc.terms_conditions || '',
            logo_url: doc.logo_url || undefined,
            bank_name: doc.bank_name || '',
            account_number: doc.account_number || '',
            ifsc_code: doc.ifsc_code || '',
          });
        } else {
          store.setCompanySettings(null);
        }
        store.setCompanySettingsLoaded(true);

        // Categories update
        store.setCategories(catRes.rows.map((c) => ({
          id: c.$id,
          tenant_id: c.tenant_id,
          name: c.name || '',
          is_active: c.is_active !== false,
          unit_name: c.unit_name || null,
          calc_type: c.calc_type || 'pcs',
          image_url: c.image_url || '',
        })));
        store.setCategoriesLoaded(true);

        // Products update
        store.setProducts(prodRes.rows.map((prod) => ({
          id: prod.$id,
          user_id: prod.user_id || '',
          name: prod.name || '',
          description: prod.description || '',
          unit_price: Number(prod.unit_price) || 0,
          cost_price: prod.cost_price !== null ? Number(prod.cost_price) : undefined,
          stock_quantity: prod.stock_quantity !== null ? Number(prod.stock_quantity) : undefined,
          unit: prod.unit || 'Pcs',
          category: prod.category || '',
          sku: prod.sku || '',
          barcode: prod.barcode || '',
          warehouse_location: prod.warehouse_location || '',
          reorder_level: prod.reorder_level !== null ? Number(prod.reorder_level) : undefined,
          created_at: prod.$createdAt || new Date().toISOString(),
          calc_type: prod.calc_type || 'pcs',
          image_url: prod.image_url || '',
        })));
        store.setProductsLoaded(true);

        // Tax rates update
        store.setTaxRates(taxRes.rows.map((t) => ({
          id: t.$id,
          tenant_id: t.tenant_id,
          name: t.name || '',
          percentage: Number(t.percentage) || 0,
          is_default: t.is_default !== false,
          is_active: t.is_active !== false,
        })));
        store.setTaxRatesLoaded(true);

        // Customers update
        const mappedCusts = custRes.rows.map((c) => ({
          id: c.$id,
          tenant_id: c.tenant_id,
          name: c.name || '',
          phone: c.phone || '',
          email: c.email || '',
          billing_address: c.billing_address || '',
          gst_number: c.gst_number || '',
          notes: c.notes || '',
          created_at: c.$createdAt || new Date().toISOString(),
        }));
        mappedCusts.sort((a, b) => a.name.localeCompare(b.name));
        store.setCustomers(mappedCusts);
        store.setCustomersLoaded(true);

        // Employees update
        store.setEmployees(empRes.rows.map((e) => ({
          id: e.$id,
          user_id: e.user_id || '',
          tenant_id: e.tenant_id,
          name: e.name || '',
          email: e.email || '',
          phone: e.phone || '',
          role: e.role || 'employee',
          department: e.department || '',
          status: e.status || 'Active',
          joined_date: e.joined_date || '',
        })));
        store.setEmployeesLoaded(true);

        // Quotes update
        store.setQuotes(quoteRes.rows.map((q) => {
          let parsedItems: LineItem[] = [];
          try { parsedItems = JSON.parse(q.items || '[]'); } catch {}

          return {
            id: q.$id,
            tenant_id: q.tenant_id,
            user_id: q.user_id || '',
            quote_number: q.quote_number || '',
            client_name: q.client_name || '',
            client_email: q.client_email || '',
            client_phone: q.client_phone || '',
            customer_id: q.customer_id || undefined,
            status: q.status as any,
            subtotal: Number(q.subtotal) || 0,
            discount: Number(q.discount) || 0,
            tax: Number(q.tax) || 0,
            total: Number(q.total) || 0,
            notes: q.notes || '',
            valid_until: q.valid_until || '',
            created_at: q.$createdAt || new Date().toISOString(),
            items: parsedItems,
            payment_status: q.payment_status as any || 'Pending',
            payment_method: q.payment_method || undefined,
            delivery_date: q.delivery_date || undefined,
            delivery_partner: q.delivery_partner || undefined,
            tracking_number: q.tracking_number || undefined,
            delivery_status: q.delivery_status as any || 'Pending',
            delivery_note: q.delivery_note || undefined,
          };
        }));
        store.setQuotesLoaded(true);

        // Stock movements update
        store.setStockMovements(movRes.rows.map((m) => ({
          id: m.$id,
          tenant_id: m.tenant_id,
          product_id: m.product_id || '',
          product_name: m.product_name || '',
          movement_type: m.movement_type as any,
          quantity: Number(m.quantity) || 0,
          note: m.note || undefined,
          supplier: m.supplier || undefined,
          created_at: m.$createdAt || new Date().toISOString(),
        })));
        store.setStockMovementsLoaded(true);

        console.log('Background sync completed successfully!');
      } catch (err) {
        console.error('Background sync failed:', err);
      }
    };

    runBackgroundSync();
  }, [user]);

  // 2. Real-time Subscription to listen for database edits/creates/deletes on other devices
  useEffect(() => {
    if (!user) return;

    console.log('Subscribing to Appwrite Realtime events for tenant:', user.tenant_id);

    const unsubscribe = client.subscribe(
      [
        `databases.${DATABASE_ID}.collections.${COLLECTIONS.QUOTES}.documents`,
        `databases.${DATABASE_ID}.collections.${COLLECTIONS.PRODUCTS}.documents`,
        `databases.${DATABASE_ID}.collections.${COLLECTIONS.CATEGORIES}.documents`,
        `databases.${DATABASE_ID}.collections.${COLLECTIONS.TAX_RATES}.documents`,
        `databases.${DATABASE_ID}.collections.${COLLECTIONS.CUSTOMERS}.documents`,
        `databases.${DATABASE_ID}.collections.${COLLECTIONS.EMPLOYEES}.documents`,
        `databases.${DATABASE_ID}.collections.${COLLECTIONS.STOCK_MOVEMENTS}.documents`,
        `databases.${DATABASE_ID}.collections.${COLLECTIONS.COMPANY_SETTINGS}.documents`,
      ],
      (response) => {
        const event = response.events[0] || '';
        const payload: any = response.payload;

        // Skip events from other tenants if payload has tenant_id and it mismatches
        if (payload.tenant_id && payload.tenant_id !== user.tenant_id) {
          return;
        }

        animateLayout();

        // Determine collection & action from the event string
        const parts = event.split('.');
        const collectionId = parts[3]; 
        const action = parts[5]; 

        if (!collectionId || !action) return;

        switch (collectionId) {
          case COLLECTIONS.QUOTES: {
            if (action === 'delete') {
              store.setQuotes(store.quotes.filter((q) => q.id !== payload.$id));
            } else {
              let parsedItems: LineItem[] = [];
              try { parsedItems = JSON.parse(payload.items || '[]'); } catch {}

              const quoteItem: Quote = {
                id: payload.$id,
                tenant_id: payload.tenant_id,
                user_id: payload.user_id || '',
                quote_number: payload.quote_number || '',
                client_name: payload.client_name || '',
                client_email: payload.client_email || '',
                client_phone: payload.client_phone || '',
                customer_id: payload.customer_id || undefined,
                status: payload.status as any,
                subtotal: Number(payload.subtotal) || 0,
                discount: Number(payload.discount) || 0,
                tax: Number(payload.tax) || 0,
                total: Number(payload.total) || 0,
                notes: payload.notes || '',
                valid_until: payload.valid_until || '',
                created_at: payload.$createdAt || new Date().toISOString(),
                items: parsedItems,
                payment_status: payload.payment_status as any || 'Pending',
                payment_method: payload.payment_method || undefined,
                delivery_date: payload.delivery_date || undefined,
                delivery_partner: payload.delivery_partner || undefined,
                tracking_number: payload.tracking_number || undefined,
                delivery_status: payload.delivery_status as any || 'Pending',
                delivery_note: payload.delivery_note || undefined,
              };

              if (action === 'create') {
                if (!store.quotes.some((q) => q.id === quoteItem.id)) {
                  store.setQuotes([quoteItem, ...store.quotes]);
                }
              } else if (action === 'update') {
                store.setQuotes(
                  store.quotes.map((q) => (q.id === quoteItem.id ? quoteItem : q))
                );
              }
            }
            break;
          }

          case COLLECTIONS.PRODUCTS: {
            if (action === 'delete') {
              store.setProducts(store.products.filter((p) => p.id !== payload.$id));
            } else {
              const productItem: Product = {
                id: payload.$id,
                user_id: payload.user_id || '',
                name: payload.name || '',
                description: payload.description || '',
                unit_price: Number(payload.unit_price) || 0,
                cost_price: payload.cost_price !== null ? Number(payload.cost_price) : undefined,
                stock_quantity: payload.stock_quantity !== null ? Number(payload.stock_quantity) : undefined,
                unit: payload.unit || 'Pcs',
                category: payload.category || '',
                sku: payload.sku || '',
                barcode: payload.barcode || '',
                warehouse_location: payload.warehouse_location || '',
                reorder_level: payload.reorder_level !== null ? Number(payload.reorder_level) : undefined,
                created_at: payload.$createdAt || new Date().toISOString(),
                calc_type: payload.calc_type || 'pcs',
                image_url: payload.image_url || '',
              };

              if (action === 'create') {
                if (!store.products.some((p) => p.id === productItem.id)) {
                  store.setProducts([productItem, ...store.products]);
                }
              } else if (action === 'update') {
                store.setProducts(
                  store.products.map((p) => (p.id === productItem.id ? productItem : p))
                );
              }
            }
            break;
          }

          case COLLECTIONS.CATEGORIES: {
            if (action === 'delete') {
              store.setCategories(store.categories.filter((c) => c.id !== payload.$id));
            } else {
              const categoryItem: Category = {
                id: payload.$id,
                tenant_id: payload.tenant_id,
                name: payload.name || '',
                is_active: payload.is_active !== false,
                unit_name: payload.unit_name || null,
                calc_type: payload.calc_type || 'pcs',
                image_url: payload.image_url || '',
              };

              if (action === 'create') {
                if (!store.categories.some((c) => c.id === categoryItem.id)) {
                  store.setCategories([...store.categories, categoryItem]);
                }
              } else if (action === 'update') {
                store.setCategories(
                  store.categories.map((c) => (c.id === categoryItem.id ? categoryItem : c))
                );
              }
            }
            break;
          }

          case COLLECTIONS.TAX_RATES: {
            if (action === 'delete') {
              store.setTaxRates(store.taxRates.filter((t) => t.id !== payload.$id));
            } else {
              const taxRateItem: TaxRate = {
                id: payload.$id,
                tenant_id: payload.tenant_id,
                name: payload.name || '',
                percentage: Number(payload.percentage) || 0,
                is_default: payload.is_default !== false,
                is_active: payload.is_active !== false,
              };

              if (action === 'create') {
                if (!store.taxRates.some((t) => t.id === taxRateItem.id)) {
                  const list = taxRateItem.is_default 
                    ? [...store.taxRates.map(t => ({ ...t, is_default: false })), taxRateItem]
                    : [...store.taxRates, taxRateItem];
                  store.setTaxRates(list);
                }
              } else if (action === 'update') {
                const list = store.taxRates.map((t) => {
                  if (taxRateItem.is_default && t.id !== taxRateItem.id) {
                    return { ...t, is_default: false };
                  }
                  if (t.id === taxRateItem.id) return taxRateItem;
                  return t;
                });
                store.setTaxRates(list);
              }
            }
            break;
          }

          case COLLECTIONS.CUSTOMERS: {
            if (action === 'delete') {
              store.setCustomers(store.customers.filter((c) => c.id !== payload.$id));
            } else {
              const customerItem: Customer = {
                id: payload.$id,
                tenant_id: payload.tenant_id,
                name: payload.name || '',
                phone: payload.phone || '',
                email: payload.email || '',
                billing_address: payload.billing_address || '',
                gst_number: payload.gst_number || '',
                notes: payload.notes || '',
                created_at: payload.$createdAt || new Date().toISOString(),
              };

              if (action === 'create') {
                if (!store.customers.some((c) => c.id === customerItem.id)) {
                  store.setCustomers(
                    [customerItem, ...store.customers].sort((a, b) => a.name.localeCompare(b.name))
                  );
                }
              } else if (action === 'update') {
                store.setCustomers(
                  store.customers.map((c) => (c.id === customerItem.id ? customerItem : c))
                );
              }
            }
            break;
          }

          case COLLECTIONS.EMPLOYEES: {
            if (action === 'delete') {
              store.setEmployees(store.employees.filter((e) => e.id !== payload.$id));
            } else {
              const employeeItem: Employee = {
                id: payload.$id,
                user_id: payload.user_id || '',
                tenant_id: payload.tenant_id,
                name: payload.name || '',
                email: payload.email || '',
                phone: payload.phone || '',
                role: payload.role || 'employee',
                department: payload.department || '',
                status: payload.status || 'Active',
                joined_date: payload.joined_date || '',
              };

              if (action === 'create') {
                if (!store.employees.some((e) => e.id === employeeItem.id)) {
                  store.setEmployees([...store.employees, employeeItem]);
                }
              } else if (action === 'update') {
                store.setEmployees(
                  store.employees.map((e) => (e.id === employeeItem.id ? employeeItem : e))
                );
              }
            }
            break;
          }

          case COLLECTIONS.STOCK_MOVEMENTS: {
            if (action === 'delete') {
              store.setStockMovements(store.stockMovements.filter((m) => m.id !== payload.$id));
            } else {
              const movementItem: StockMovement = {
                id: payload.$id,
                tenant_id: payload.tenant_id,
                product_id: payload.product_id || '',
                product_name: payload.product_name || '',
                movement_type: payload.movement_type as any,
                quantity: Number(payload.quantity) || 0,
                note: payload.note || undefined,
                supplier: payload.supplier || undefined,
                created_at: payload.$createdAt || new Date().toISOString(),
              };

              if (action === 'create') {
                if (!store.stockMovements.some((m) => m.id === movementItem.id)) {
                  store.setStockMovements([movementItem, ...store.stockMovements]);
                }
              } else if (action === 'update') {
                store.setStockMovements(
                  store.stockMovements.map((m) => (m.id === movementItem.id ? movementItem : m))
                );
              }
            }
            break;
          }

          case COLLECTIONS.COMPANY_SETTINGS: {
            if (action === 'delete') {
              store.setCompanySettings(null);
            } else {
              const settingsItem: CompanySettings = {
                id: payload.$id,
                tenant_id: payload.tenant_id,
                company_name: payload.company_name || '',
                email: payload.email || '',
                phone: payload.phone || '',
                website: payload.website || '',
                gst_number: payload.gst_number || '',
                address: payload.address || '',
                currency: payload.currency || '₹',
                date_format: payload.date_format || 'DD/MM/YYYY',
                invoice_prefix: payload.invoice_prefix || 'INV-',
                next_invoice_number: Number(payload.next_invoice_number) || 1,
                default_notes: payload.default_notes || '',
                terms_conditions: payload.terms_conditions || '',
                logo_url: payload.logo_url || undefined,
                bank_name: payload.bank_name || '',
                account_number: payload.account_number || '',
                ifsc_code: payload.ifsc_code || '',
              };
              store.setCompanySettings(settingsItem);
            }
            break;
          }
        }
      }
    );

    return () => {
      console.log('Unsubscribing from Appwrite Realtime events');
      unsubscribe();
    };
  }, [user]);
};
