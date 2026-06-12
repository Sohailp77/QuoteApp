import * as ImagePicker from 'expo-image-picker';
import { Alert } from 'react-native';
import { storage, APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, ID } from '../config/appwrite';

/**
 * Request permissions and let user select an image from camera or library.
 * Uploads the image to Appwrite Storage bucket 'images' and returns the view URL.
 */
export const selectAndUploadImage = async (): Promise<string | null> => {
  // Ask for permissions
  const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
  const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();

  if (libraryStatus !== 'granted' || cameraStatus !== 'granted') {
    Alert.alert('Permission Denied', 'Permissions to access camera roll and camera are required to upload images.');
    return null;
  }

  return new Promise((resolve) => {
    Alert.alert(
      'Select Image Source',
      'Choose where to pick the image from',
      [
        {
          text: 'Camera',
          onPress: async () => {
            try {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                const url = await uploadToAppwrite(result.assets[0].uri);
                resolve(url);
              } else {
                resolve(null);
              }
            } catch (e: any) {
              Alert.alert('Error picking image', e.message);
              resolve(null);
            }
          },
        },
        {
          text: 'Photo Library',
          onPress: async () => {
            try {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets && result.assets.length > 0) {
                const url = await uploadToAppwrite(result.assets[0].uri);
                resolve(url);
              } else {
                resolve(null);
              }
            } catch (e: any) {
              Alert.alert('Error picking image', e.message);
              resolve(null);
            }
          },
        },
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => resolve(null),
        },
      ]
    );
  });
};

const uploadToAppwrite = async (uri: string): Promise<string | null> => {
  try {
    const filename = uri.split('/').pop() || 'upload.jpg';
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : `image/jpeg`;

    const file = {
      uri,
      name: filename,
      type,
    } as any;

    const response = await storage.createFile(
      'images', // Bucket ID
      ID.unique(),
      file
    );

    // Generate preview URL
    const url = `${APPWRITE_ENDPOINT}/storage/buckets/images/files/${response.$id}/preview?project=${APPWRITE_PROJECT_ID}`;
    return url;
  } catch (error: any) {
    console.error('Appwrite upload error:', error);
    Alert.alert(
      'Upload Failed',
      `Failed to upload image: ${error.message || 'Unknown error'}.\n\nEnsure that you have created the Storage Bucket 'images' in Appwrite Console, or try again.`
    );
    return null;
  }
};
