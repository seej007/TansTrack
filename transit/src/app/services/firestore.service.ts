import { Injectable } from '@angular/core';
import { AngularFirestore, AngularFirestoreCollection, DocumentReference } from '@angular/fire/compat/firestore';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';

@Injectable({
  providedIn: 'root'
})
export class FirestoreService {

  constructor(private firestore: AngularFirestore) { }

  // Generic collection getter
  getCollection<T>(path: string): AngularFirestoreCollection<T> {
    return this.firestore.collection<T>(path);
  }

  // Get all documents from a collection
  getAll<T>(collectionName: string): Observable<T[]> {
    return this.firestore.collection<T>(collectionName).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as T;
        const id = a.payload.doc.id;
        return { id, ...data } as T & { id: string };
      }))
    );
  }

  // Get a document by ID
  getById<T>(collectionName: string, id: string): Observable<T> {
    return this.firestore.collection<T>(collectionName).doc<T>(id).valueChanges().pipe(
      map(data => {
        if (data) {
          return { id, ...data } as T & { id: string };
        }
        throw new Error('Document does not exist');
      })
    );
  }

  // Add a new document to a collection
  add<T>(collectionName: string, data: T): Promise<DocumentReference<T>> {
    return this.firestore.collection<T>(collectionName).add(data);
  }

  // Update a document in a collection
  update<T>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
    console.log(`FirestoreService: Updating document in ${collectionName} with ID ${id}:`, data);
    
    if (!id) {
      console.error('Update failed: Document ID is empty or undefined');
      return Promise.reject(new Error('Document ID is required for update'));
    }
    
    return this.firestore.collection<T>(collectionName).doc(id).update(data)
      .then(() => {
        console.log(`FirestoreService: Successfully updated document in ${collectionName} with ID ${id}`);
      })
      .catch(error => {
        console.error(`FirestoreService: Error updating document in ${collectionName} with ID ${id}:`, error);
        throw error;
      });
  }

  // Delete a document from a collection
  delete(collectionName: string, id: string): Promise<void> {
    return this.firestore.collection(collectionName).doc(id).delete();
  }

  // Get documents with query
  query<T>(collectionName: string, fieldPath: string, operator: firebase.firestore.WhereFilterOp, value: any): Observable<T[]> {
    return this.firestore.collection<T>(collectionName, ref => ref.where(fieldPath, operator, value))
      .snapshotChanges().pipe(
        map(actions => actions.map(a => {
          const data = a.payload.doc.data() as T;
          const id = a.payload.doc.id;
          return { id, ...data } as T & { id: string };
        }))
      );
  }

  // Add or update a user document in the Users collection
  async addOrUpdateUser(userData: any): Promise<void> {
    if (!userData.uid) {
      throw new Error('User data must include a uid');
    }
    const db = firebase.firestore();
    const docRef = db.collection('Users').doc(userData.uid);

    try {
      await docRef.set(userData, { merge: true }); // merge: true updates or creates
      console.log('User document written/updated for UID:', userData.uid);
    } catch (error) {
      console.error('Error in addOrUpdateUser:', error);
      throw error;
    }
  }
  
  // Update just the display name in the Users collection
  async updateUserDisplayName(uid: string, displayName: string): Promise<void> {
    if (!uid) {
      console.error('updateUserDisplayName failed: User ID is empty or undefined');
      throw new Error('User ID is required');
    }
    
    console.log('FirestoreService: Updating displayName in Users collection for UID:', uid);
    
    const db = firebase.firestore();
    const docRef = db.collection('Users').doc(uid);
    
    try {
      await docRef.update({ displayName });
      console.log('Display name updated in Users collection for UID:', uid);
    } catch (error) {
      console.error('Error updating display name in Users collection:', error);
      throw error;
    }
  }

  // Delete a user account and all associated data
  async deleteUserAccount(uid: string): Promise<void> {
    if (!uid) {
      console.error('deleteUserAccount failed: User ID is empty or undefined');
      throw new Error('User ID is required');
    }
    
    console.log('FirestoreService: Deleting user account for UID:', uid);
    
    const db = firebase.firestore();
    const batch = db.batch();
    
    try {
      // 1. Find and delete user document in Users collection
      const userDocRef = db.collection('Users').doc(uid);
      batch.delete(userDocRef);
      console.log('Marked Users document for deletion');
      
      // 2. Find and delete student document
      const studentQuerySnapshot = await db.collection('students')
        .where('userId', '==', uid).get();
        
      if (!studentQuerySnapshot.empty) {
        const studentDoc = studentQuerySnapshot.docs[0];
        batch.delete(studentDoc.ref);
        console.log('Marked student document for deletion:', studentDoc.id);
      }
      
      // 3. Find and delete any job applications
      const applicationsQuerySnapshot = await db.collection('applications')
        .where('studentId', '==', uid).get();
        
      applicationsQuerySnapshot.forEach(doc => {
        batch.delete(doc.ref);
        console.log('Marked application document for deletion:', doc.id);
      });
      
      // 4. Execute the batch delete
      await batch.commit();
      console.log('Successfully deleted all user data for UID:', uid);
      
      return Promise.resolve();
    } catch (error) {
      console.error('Error deleting user account:', error);
      throw error;
    }
  }
  
  // Sync user's display name across Auth, Users collection, and students collection
  async syncUserDisplayName(uid: string): Promise<string | null> {
    if (!uid) {
      console.error('syncUserDisplayName failed: User ID is empty or undefined');
      throw new Error('User ID is required');
    }
    
    console.log('FirestoreService: Syncing display name for UID:', uid);
    
    try {
      const db = firebase.firestore();
      
      // Priority order: Auth > Users > students
      const auth = firebase.auth();
      const user = auth.currentUser;
      
      // Step 1: Get all possible name sources
      let authName: string | null = null;
      let usersName: string | null = null;
      let studentName: string | null = null;
      let finalName: string | null = null;
      
      // Get name from Auth
      if (user && user.uid === uid && user.displayName) {
        authName = user.displayName;
        console.log('📝 Found name in Auth:', authName);
      }
      
      // Get name from Users collection
      const userDoc = await db.collection('Users').doc(uid).get();
      if (userDoc.exists && userDoc.data()?.['displayName']) {
        usersName = userDoc.data()?.['displayName'];
        console.log('📝 Found name in Users collection:', usersName);
      }
      
      // Get name from students collection
      const studentQuery = await db.collection('students')
        .where('userId', '==', uid).limit(1).get();
      
      if (!studentQuery.empty) {
        const studentData = studentQuery.docs[0].data();
        if (studentData && studentData['name']) {
          studentName = studentData['name'];
          console.log('📝 Found name in students collection:', studentName);
        }
      }
      
      // Step 2: Determine the most authoritative name (priority order)
      finalName = authName || usersName || studentName || null;
      
      if (!finalName) {
        console.log('⚠️ No display name found in any source');
        return null;
      }
      
      console.log('✅ Final determined name:', finalName);
      
      // Step 3: Sync the name to all locations
      const batch = db.batch();
      let updatesMade = false;
      
      // Update Auth if needed
      if (user && user.uid === uid && user.displayName !== finalName) {
        await user.updateProfile({ displayName: finalName });
        console.log('✅ Updated Auth display name');
        updatesMade = true;
      }
      
      // Update Users collection if needed
      if (userDoc.exists) {
        if (userDoc.data()?.['displayName'] !== finalName) {
          batch.update(userDoc.ref, { 
            displayName: finalName,
            updatedAt: new Date().toISOString() 
          });
          console.log('✅ Queued update to Users collection');
          updatesMade = true;
        }
      } else {
        // Create Users document if it doesn't exist
        batch.set(db.collection('Users').doc(uid), {
          uid: uid,
          displayName: finalName,
          email: user?.email || '',
          accountType: 'student',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        console.log('✅ Queued creation of new Users document');
        updatesMade = true;
      }
      
      // Update student collection if needed
      if (!studentQuery.empty && studentName !== finalName) {
        batch.update(studentQuery.docs[0].ref, { 
          name: finalName,
          updatedAt: new Date().toISOString() 
        });
        console.log('✅ Queued update to students collection');
        updatesMade = true;
      }
      
      // Commit batch updates if any were made
      if (updatesMade) {
        await batch.commit();
        console.log('✅ All name sync operations completed successfully');
      } else {
        console.log('ℹ️ No updates needed, names are already in sync');
      }
      
      return finalName;
    } catch (error) {
      console.error('❌ Error syncing display name:', error);
      throw error;
    }
  }

  /**
   * Updates skills for a student in both students and users collections
   * @param userId User ID to update skills for
   * @param skills Array of skill strings to save
   */
  async updateStudentSkills(userId: string, skills: string[]): Promise<void> {
    try {
      console.log(`🔄 Updating skills for user ${userId}`);
      
      // First, update the skills in the students collection
      const studentQuery = await this.firestore.collection('students', ref => 
        ref.where('userId', '==', userId)).get().toPromise();
        
      if (studentQuery && !studentQuery.empty) {
        const studentDoc = studentQuery.docs[0];
        await studentDoc.ref.update({ skills });
        console.log('✅ Updated skills in students collection');
      } else {
        console.log('⚠️ No matching student document found');
      }
      
      // Then update the user document as well to keep data in sync
      await this.firestore.collection('users').doc(userId).update({
        skills
      });
      
      console.log('✅ Updated skills in users collection');
      
      return;
    } catch (error) {
      console.error('❌ Error updating student skills:', error);
      throw error;
    }
  }

}
  