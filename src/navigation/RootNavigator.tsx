import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { supabase } from '../config/supabase';
import { useAuthStore } from '../store/useAuthStore';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { SplashScreen } from '../screens/auth/SplashScreen';

const Root = createStackNavigator();

export const RootNavigator: React.FC = () => {
  const user = useAuthStore((s) => s.user);
  const isLoading = useAuthStore((s) => s.isLoading);
  const setUser = useAuthStore((s) => s.setUser);
  const setLoading = useAuthStore((s) => s.setLoading);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', firebaseUser.uid)
            .maybeSingle();
          
          if (userData) {
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || userData.display_name || 'User',
              photoURL: firebaseUser.photoURL || userData.photo_url || undefined,
              role: (userData.role as 'boss' | 'employee') || 'boss',
              tenant_id: userData.tenant_id || `tenant_${firebaseUser.uid}`,
            });
          } else {
            // Check if there is an employee record with this email
            let resolvedRole: 'boss' | 'employee' = 'boss';
            let resolvedTenantId = `tenant_${firebaseUser.uid}`;
            
            if (firebaseUser.email) {
              const { data: empData, error: empError } = await supabase
                .from('employees')
                .select('*')
                .eq('email', firebaseUser.email.toLowerCase().trim())
                .limit(1);
              
              if (empData && empData.length > 0) {
                const emp = empData[0];
                resolvedRole = 'employee';
                resolvedTenantId = emp.tenant_id || emp.user_id;
                
                // Update employee record with their actual Firebase UID
                await updateEmployeeUid(emp.id, firebaseUser.uid);
              }
            }
            
            // Create user profile document in users table
            const newUserData = {
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              display_name: firebaseUser.displayName || 'User',
              role: resolvedRole,
              tenant_id: resolvedTenantId,
              photo_url: firebaseUser.photoURL || null,
            };
            
            await supabase.from('users').insert(newUserData);
            
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              photoURL: firebaseUser.photoURL || undefined,
              role: resolvedRole,
              tenant_id: resolvedTenantId,
            });
          }
        } catch (err) {
          console.error('Error fetching user document:', err);
          // Fallback to local state if offline or query fails
          setUser({
            id: firebaseUser.uid,
            email: firebaseUser.email || '',
            displayName: firebaseUser.displayName || 'User',
            photoURL: firebaseUser.photoURL || undefined,
            role: 'boss',
            tenant_id: `tenant_${firebaseUser.uid}`,
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const updateEmployeeUid = async (docId: string, uid: string) => {
    try {
      await supabase.from('employees').update({ user_id: uid }).eq('id', docId);
    } catch (err) {
      console.warn('Failed to update employee uid:', err);
    }
  };

  if (isLoading) return <SplashScreen />;

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
