import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
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
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);
          
          if (userDoc.exists()) {
            const userData = userDoc.data();
            setUser({
              id: firebaseUser.uid,
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || userData.displayName || 'User',
              photoURL: firebaseUser.photoURL || undefined,
              role: userData.role || 'boss',
              tenant_id: userData.tenant_id || `tenant_${firebaseUser.uid}`,
            });
          } else {
            // Check if there is an employee record with this email
            let resolvedRole: 'boss' | 'employee' = 'boss';
            let resolvedTenantId = `tenant_${firebaseUser.uid}`;
            
            if (firebaseUser.email) {
              const empQuery = query(
                collection(db, 'employees'),
                where('email', '==', firebaseUser.email.toLowerCase().trim())
              );
              const empSnap = await getDocs(empQuery);
              if (!empSnap.empty) {
                const empDoc = empSnap.docs[0];
                const empData = empDoc.data();
                resolvedRole = 'employee';
                resolvedTenantId = empData.tenant_id || empData.user_id;
                
                // Update employee record with their actual Firebase UID
                await updateEmployeeUid(empDoc.id, firebaseUser.uid);
              }
            }
            
            // Create user profile document in users collection
            const newUserData = {
              email: firebaseUser.email || '',
              displayName: firebaseUser.displayName || 'User',
              role: resolvedRole,
              tenant_id: resolvedTenantId,
            };
            
            await setDoc(userDocRef, newUserData);
            
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
          // Fallback to local state if offline or Firestore query fails
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
      const empRef = doc(db, 'employees', docId);
      await setDoc(empRef, { user_id: uid }, { merge: true });
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
