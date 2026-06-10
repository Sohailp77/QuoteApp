import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createStackNavigator } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';

import { HomeScreen } from '../screens/home/HomeScreen';
import { QuotesScreen } from '../screens/quotes/QuotesScreen';
import { QuoteDetailScreen } from '../screens/quotes/QuoteDetailScreen';
import { CreateQuoteScreen } from '../screens/quotes/CreateQuoteScreen';
import { EmployeesScreen } from '../screens/employees/EmployeesScreen';
import { EmployeeFormScreen } from '../screens/employees/EmployeeFormScreen';
import { ProductsScreen } from '../screens/products/ProductsScreen';
import { ProductFormScreen } from '../screens/products/ProductFormScreen';
import { ProfileScreen } from '../screens/profile/ProfileScreen';
import { CompanySettingsScreen } from '../screens/profile/CompanySettingsScreen';
import { TaxRatesScreen } from '../screens/profile/TaxRatesScreen';
import { ProductCategoriesScreen } from '../screens/profile/ProductCategoriesScreen';

import { Colors } from '../theme';

const Tab = createBottomTabNavigator();
const QuoteStack = createStackNavigator();
const EmployeeStack = createStackNavigator();
const ProductStack = createStackNavigator();
const ProfileStack = createStackNavigator();

const QuotesStack = () => (
  <QuoteStack.Navigator screenOptions={{ headerShown: false }}>
    <QuoteStack.Screen name="QuotesList" component={QuotesScreen} />
    <QuoteStack.Screen name="QuoteDetail" component={QuoteDetailScreen} />
    <QuoteStack.Screen name="CreateQuote" component={CreateQuoteScreen} />
  </QuoteStack.Navigator>
);

const EmployeesStack = () => (
  <EmployeeStack.Navigator screenOptions={{ headerShown: false }}>
    <EmployeeStack.Screen name="EmployeesList" component={EmployeesScreen} />
    <EmployeeStack.Screen name="EmployeeForm" component={EmployeeFormScreen} />
  </EmployeeStack.Navigator>
);

const ProductsStack = () => (
  <ProductStack.Navigator screenOptions={{ headerShown: false }}>
    <ProductStack.Screen name="ProductsList" component={ProductsScreen} />
    <ProductStack.Screen name="ProductForm" component={ProductFormScreen} />
  </ProductStack.Navigator>
);

const ProfilesStack = () => (
  <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
    <ProfileStack.Screen name="ProfileMain" component={ProfileScreen} />
    <ProfileStack.Screen name="CompanySettings" component={CompanySettingsScreen} />
    <ProfileStack.Screen name="TaxRates" component={TaxRatesScreen} />
    <ProfileStack.Screen name="ProductCategories" component={ProductCategoriesScreen} />
  </ProfileStack.Navigator>
);

export const MainNavigator: React.FC = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarShowLabel: true,
      tabBarActiveTintColor: Colors.surface,
      tabBarInactiveTintColor: 'rgba(255,255,255,0.45)',
      tabBarStyle: styles.tabBar,
      tabBarLabelStyle: styles.tabLabel,
      tabBarIcon: ({ focused, color, size }) => {
        const icons: Record<string, [string, string]> = {
          Home: ['home', 'home-outline'],
          Quotes: ['document-text', 'document-text-outline'],
          Employees: ['people', 'people-outline'],
          Products: ['cube', 'cube-outline'],
          Categories: ['list', 'list-outline'],
          Profile: ['person', 'person-outline'],
        };
        const [filledIcon, outlineIcon] = icons[route.name] || ['ellipse', 'ellipse-outline'];
        return (
          <Ionicons
            name={(focused ? filledIcon : outlineIcon) as any}
            size={22}
            color={color}
          />
        );
      },
    })}
  >
    <Tab.Screen name="Home" component={HomeScreen} />
    <Tab.Screen name="Quotes" component={QuotesStack} />
    <Tab.Screen name="Employees" component={EmployeesStack} />
    <Tab.Screen name="Products" component={ProductsStack} />
    <Tab.Screen name="Profile" component={ProfilesStack} />
  </Tab.Navigator>
);

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.primary,
    borderTopWidth: 0,
    height: Platform.OS === 'ios' ? 88 : 68,
    paddingBottom: Platform.OS === 'ios' ? 24 : 10,
    paddingTop: 10,
    borderRadius: 0,
    marginHorizontal: 0,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
  },
  tabLabel: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
});
