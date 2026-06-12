import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { account, tablesDB, DATABASE_ID, COLLECTIONS, Query, ID } from '../config/appwrite';
import { useAuthStore } from '../store/useAuthStore';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { SplashScreen } from '../screens/auth/SplashScreen';
import { useRealtimeSync } from '../hooks/useRealtimeSync';

const Root = createStackNavigator();

export const RootNavigator: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const setUser = useAuthStore((s) => s.setUser);
  useRealtimeSync();
  // Internal loading state for checking session
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = async () => {
    try {
      // 1. Check if user is logged in
      const appwriteUser = await account.get();
      
      // 2. Fetch user profile from `users` collection to get role & tenant_id
      try {
        const userDocs = await tablesDB.listRows({
          databaseId: DATABASE_ID,
          tableId: COLLECTIONS.USERS,
          queries: [Query.equal('email', appwriteUser.email)]
        });

        if (userDocs.rows.length > 0) {
          const uDoc = userDocs.rows[0];
          setUser({
            id: appwriteUser.$id,
            email: appwriteUser.email,
            displayName: appwriteUser.name || uDoc.displayName || 'User',
            role: (uDoc.role as 'boss' | 'employee') || 'boss',
            tenant_id: uDoc.tenant_id,
          });
        } else {
          // If no user doc, check if they are an employee created by a boss
          let resolvedRole: 'boss' | 'employee' = 'boss';
          let resolvedTenantId = `tenant_${appwriteUser.$id}`;

          const empDocs = await tablesDB.listRows({
            databaseId: DATABASE_ID,
            tableId: COLLECTIONS.EMPLOYEES,
            queries: [Query.equal('email', appwriteUser.email.toLowerCase().trim())]
          });

          if (empDocs.rows.length > 0) {
            const emp = empDocs.rows[0];
            resolvedRole = 'employee';
            resolvedTenantId = emp.tenant_id;
            
            // Link employee record
            try {
              await tablesDB.updateRow({
                databaseId: DATABASE_ID,
                tableId: COLLECTIONS.EMPLOYEES,
                rowId: emp.$id,
                data: { user_id: appwriteUser.$id }
              });
            } catch (e) {
              console.warn('Failed to link employee uid');
            }
          }

          // Create the user profile
          await tablesDB.createRow({
            databaseId: DATABASE_ID,
            tableId: COLLECTIONS.USERS,
            rowId: ID.unique(),
            data: {
              tenant_id: resolvedTenantId,
              email: appwriteUser.email,
              displayName: appwriteUser.name || 'User',
              role: resolvedRole,
            }
          });

          setUser({
            id: appwriteUser.$id,
            email: appwriteUser.email,
            displayName: appwriteUser.name || 'User',
            role: resolvedRole,
            tenant_id: resolvedTenantId,
          });
        }
      } catch (err) {
        console.error('Error fetching/creating user profile:', err);
        // Fallback
        setUser({
          id: appwriteUser.$id,
          email: appwriteUser.email,
          displayName: appwriteUser.name || 'User',
          role: 'boss',
          tenant_id: `tenant_${appwriteUser.$id}`,
        });
      }
    } catch (error) {
      // Not logged in or error checking session
      setUser(null);
    } finally {
      setIsInitializing(false);
    }
  };

  if (isInitializing) return <SplashScreen />;

  return (
    <NavigationContainer>
      <Root.Navigator screenOptions={{ headerShown: false, animationEnabled: true }}>
        {user ? (
          <Root.Screen name="Main" component={MainNavigator} />
        ) : (
          <Root.Screen name="Auth" component={AuthNavigator} />
        )}
      </Root.Navigator>
    </NavigationContainer>
  );
};
