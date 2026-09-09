import React from 'react';
import { View, StyleSheet, Platform, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { getFocusedRouteNameFromRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HomeScreen } from '../screens/home/HomeScreen';
import { AnalyticsDashboardScreen } from '../screens/home/AnalyticsDashboardScreen';
import { QuotesScreen } from '../screens/quotes/QuotesScreen';
import { QuoteDetailScreen } from '../screens/quotes/QuoteDetailScreen';
import { CreateQuoteScreen } from '../screens/quotes/CreateQuoteScreen';
import { EmployeesScreen } from '../screens/employees/EmployeesScreen';
import { EmployeeFormScreen } from '../screens/employees/EmployeeFormScreen';
import { CustomersScreen } from '../screens/customers/CustomersScreen';
import { CustomerFormScreen } from '../screens/customers/CustomerFormScreen';
import { ProductsScreen } from '../screens/products/ProductsScreen';
import { ProductFormScreen } from '../screens/products/ProductFormScreen';
import { CategoryManagerScreen } from '../screens/products/CategoryManagerScreen';
import { StockManagementScreen } from '../screens/products/StockManagementScreen';
import { ReorderStockScreen } from '../screens/products/ReorderStockScreen';
import { VendorsScreen } from '../screens/vendors/VendorsScreen';
import { VendorFormScreen } from '../screens/vendors/VendorFormScreen';
import { DirectSalesScreen } from '../screens/sales/DirectSalesScreen';
import { CreateDirectSaleScreen } from '../screens/sales/CreateDirectSaleScreen';
import { PaymentsScreen } from '../screens/payments/PaymentsScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { CompanySettingsScreen } from '../screens/profile/CompanySettingsScreen';
import { TaxRatesScreen } from '../screens/profile/TaxRatesScreen';
import { ProductCategoriesScreen } from '../screens/profile/ProductCategoriesScreen';
import { WarehouseScreen } from '../screens/profile/WarehouseScreen';
import { useAppTheme } from '../context/ThemeContext';
import { Radius, Shadow } from '../theme';

const Tab = createBottomTabNavigator();
const HomeStack = createStackNavigator();
const QuoteStack = createStackNavigator();
const PeopleStack = createStackNavigator();
const ProductStack = createStackNavigator();
const SalesStack = createStackNavigator();
const ProfileStack = createStackNavigator();

const HomeStackNav = () => (
  <HomeStack.Navigator screenOptions={{ headerShown: false }}>
    <HomeStack.Screen name="HomeMain" component={HomeScreen} />
    <HomeStack.Screen name="AnalyticsDashboard" component={AnalyticsDashboardScreen} />
  </HomeStack.Navigator>
);

const QuotesStack = () => (
  <QuoteStack.Navigator screenOptions={{ headerShown: false }}>
    <QuoteStack.Screen name="QuotesList" component={QuotesScreen} />
    <QuoteStack.Screen name="QuoteDetail" component={QuoteDetailScreen} />
    <QuoteStack.Screen name="CreateQuote" component={CreateQuoteScreen} />
  </QuoteStack.Navigator>
);

const PeopleStackNav = () => (
  <PeopleStack.Navigator screenOptions={{ headerShown: false }}>
    <PeopleStack.Screen name="EmployeesList" component={EmployeesScreen} />
    <PeopleStack.Screen name="EmployeeForm" component={EmployeeFormScreen} />
    <PeopleStack.Screen name="CustomersList" component={CustomersScreen} />
    <PeopleStack.Screen name="CustomerForm" component={CustomerFormScreen} />
  </PeopleStack.Navigator>
);

const ProductsStack = () => (
  <ProductStack.Navigator screenOptions={{ headerShown: false }}>
    <ProductStack.Screen name="ProductsList" component={ProductsScreen} />
    <ProductStack.Screen name="ProductForm" component={ProductFormScreen} />
    <ProductStack.Screen name="CategoryManager" component={CategoryManagerScreen} />
    <ProductStack.Screen name="StockManagement" component={StockManagementScreen} />
    <ProductStack.Screen name="ReorderStock" component={ReorderStockScreen} />
    <ProductStack.Screen name="VendorsList" component={VendorsScreen} />
    <ProductStack.Screen name="VendorForm" component={VendorFormScreen} />
  </ProductStack.Navigator>
);

const SalesStackNav = () => (
  <SalesStack.Navigator screenOptions={{ headerShown: false }}>
    <SalesStack.Screen name="DirectSalesList" component={DirectSalesScreen} />
    <SalesStack.Screen name="CreateDirectSale" component={CreateDirectSaleScreen} />
  </SalesStack.Navigator>
);

const ProfilesStack = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
    <ProfileStack.Screen name="CompanySettings" component={CompanySettingsScreen} />
    <ProfileStack.Screen name="TaxRates" component={TaxRatesScreen} />
    <ProfileStack.Screen name="ProductCategories" component={ProductCategoriesScreen} />
    <ProfileStack.Screen name="Warehouse" component={WarehouseScreen} />
    <ProfileStack.Screen name="PaymentsList" component={PaymentsScreen} />
  </ProfileStack.Navigator>
);

// Helper to determine if tab bar should be displayed based on active route
const TAB_ROOT_SCREENS = [
  undefined,
  'HomeMain',
  'QuotesList',
  'EmployeesList',
  'CustomersList',
  'ProductsList',
  'DirectSalesList',
  'ProfileMain',
];

export const MainNavigator: React.FC = () => {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const styles = createStyles(colors, insets, isDark);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => {
        const routeName = getFocusedRouteNameFromRoute(route);
        const isTabRoot = TAB_ROOT_SCREENS.includes(routeName);

        return {
          headerShown: false,
          tabBarShowLabel: true,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: isTabRoot ? styles.tabBar : { display: 'none' },
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: styles.tabBarItem,
          tabBarIcon: ({ focused, color }) => {
            const icons: Record<string, [string, string]> = {
              Home: ['home', 'home-outline'],
              Quotes: ['document-text', 'document-text-outline'],
              People: ['people', 'people-outline'],
              Products: ['cube', 'cube-outline'],
              Sales: ['receipt', 'receipt-outline'],
              Profile: ['person', 'person-outline'],
            };
            const [filledIcon, outlineIcon] = icons[route.name] || ['ellipse', 'ellipse-outline'];
            return (
              <View style={focused ? styles.activeIconPill : styles.inactiveIconWrap}>
                <Ionicons
                  name={(focused ? filledIcon : outlineIcon) as any}
                  size={20}
                  color={focused ? colors.primary : colors.textSecondary}
                />
              </View>
            );
          },
        };
      }}
    >
      <Tab.Screen name="Home" component={HomeStackNav} />
      <Tab.Screen name="Quotes" component={QuotesStack} />
      <Tab.Screen name="People" component={PeopleStackNav} />
      <Tab.Screen name="Products" component={ProductsStack} />
      <Tab.Screen name="Sales" component={SalesStackNav} />
      <Tab.Screen name="Profile" component={ProfilesStack} />
    </Tab.Navigator>
  );
};

const createStyles = (colors: any, insets: any, isDark?: boolean) => StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: Math.max(insets.bottom, 14) + 6,
    left: 18,
    right: 18,
    backgroundColor: isDark ? '#1E1E1E' : '#FFFFFF',
    borderRadius: Radius.full,
    height: 64,
    paddingBottom: 6,
    paddingTop: 6,
    paddingHorizontal: 8,
    borderWidth: 1.5,
    borderColor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 90, 42, 0.12)',
    elevation: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: isDark ? 0.45 : 0.16,
    shadowRadius: 20,
  },
  tabBarItem: {
    paddingVertical: 2,
  },
  activeIconPill: {
    width: 44,
    height: 28,
    borderRadius: 14,
    backgroundColor: isDark ? 'rgba(34, 197, 94, 0.18)' : 'rgba(15, 90, 42, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveIconWrap: {
    width: 44,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginTop: 2,
    letterSpacing: -0.2,
  },
});

