import { Injectable, inject } from '@angular/core';
import { AngularFirestore, DocumentReference } from '@angular/fire/compat/firestore';
import { Observable, from, throwError } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore'; // Ensure Firestore is imported

@Injectable({
  providedIn: 'root'
})
export class FirebaseServiceService {
  constructor(private firestore: AngularFirestore) { }

  /**
   * Create a new document in the specified collection
   * @param collectionName The collection name
   * @param data The data to store
   * @returns Promise with the new document reference
   */
  Create<T>(collectionName: string, data: T): Promise<DocumentReference<T>> {
    console.log(`Creating new document in ${collectionName}:`, data);
    
    // Make sure we're using the injected instance of firestore
    const firestore = this.firestore;
    
    return firestore.collection<T>(collectionName).add(data)
      .then(docRef => {
        console.log(`Successfully created document in ${collectionName} with ID: ${docRef.id}`);
        return docRef;
      })
      .catch(error => {
        console.error(`Error creating document in ${collectionName}:`, error);
        throw error;
      });
  }

  /**
   * Read a document by ID from specified collection
   * @param collectionName The collection name
   * @param id The document ID
   * @returns Promise with the document data
   */
  Read<T>(collectionName: string, id: string): Promise<T & { id: string }> {
    console.log(`Reading document from ${collectionName} with ID: ${id}`);
    
    // Use a reference to Firestore from firebase instead of the injected service 
    // to avoid potential injection context issues
    const db = firebase.firestore();
    
    return db.collection(collectionName).doc(id).get()
      .then(doc => {
        if (doc.exists) {
          console.log(`Successfully read document from ${collectionName} with ID: ${id}`);
          return { id: doc.id, ...doc.data() } as T & { id: string };
        } else {
          const error = new Error(`Document not found in ${collectionName} with ID: ${id}`);
          console.error(error);
          throw error;
        }
      })
      .catch(error => {
        console.error(`Error reading document from ${collectionName} with ID: ${id}:`, error);
        throw error;
      });
  }

  /**
   * Get all documents from a collection
   * @param collectionName The collection name
   * @returns Observable of all documents
   */
  ReadAll<T>(collectionName: string): Observable<(T & { id: string })[]> {
    console.log(`Reading all documents from ${collectionName}`);
    
    // Make sure we're using the injected instance of firestore
    const firestore = this.firestore;
    
    return firestore.collection<T>(collectionName).snapshotChanges().pipe(
      map(actions => actions.map(a => {
        const data = a.payload.doc.data() as T;
        const id = a.payload.doc.id;
        return { id, ...data } as T & { id: string };
      })),
      catchError(error => {
        console.error(`Error reading all documents from ${collectionName}:`, error);
        return throwError(() => error);
      })
    );
  }

  /**
   * Query documents in a collection
   * @param collectionName The collection name
   * @param fieldPath Field path to query
   * @param operator Comparison operator
   * @param value Value to compare against
   * @returns Observable of matching documents
   */
  Query<T>(collectionName: string, fieldPath: string, operator: firebase.firestore.WhereFilterOp, value: any): Observable<(T & { id: string })[]> {
    console.log(`Querying ${collectionName} where ${fieldPath} ${operator} ${value}`);
    
    // Use the instance variable directly - no need for a local const
    // which might trigger an injection context issue
    
    try {
      return this.firestore.collection<T>(collectionName, ref => ref.where(fieldPath, operator, value))
        .snapshotChanges().pipe(
          map(actions => actions.map(a => {
            const data = a.payload.doc.data() as T;
            const id = a.payload.doc.id;
            return { id, ...data } as T & { id: string };
          })),
          catchError(error => {
            console.error(`Error querying ${collectionName}:`, error);
            return throwError(() => error);
          })
        );
    } catch (error) {
      console.error(`Error setting up query for ${collectionName}:`, error);
      return throwError(() => error);
    }
  }

  /**
   * Update a document by ID in specified collection
   * @param collectionName The collection name
   * @param id The document ID
   * @param data The data to update
   * @returns Promise resolving when update completes
   */
  Update<T>(collectionName: string, id: string, data: Partial<T>): Promise<void> {
    console.log(`Updating document in ${collectionName} with ID ${id}:`, data);
    
    // Special logging for displayName updates to track them better
    if (collectionName === 'Users' && 'displayName' in data) {
      console.log(`⭐ Updating displayName in Users collection to: ${(data as any).displayName}`);
    }
    
    if (!id) {
      const error = new Error('Document ID is required for update');
      console.error(`Update failed: ${error.message}`);
      return Promise.reject(error);
    }
    
    // Make sure we're using the injected instance of firestore
    const firestore = this.firestore;
    
    return firestore.collection<T>(collectionName).doc(id).update(data)
      .then(() => {
        console.log(`Successfully updated document in ${collectionName} with ID ${id}`);
        
        // Special confirmation for displayName updates
        if (collectionName === 'Users' && 'displayName' in data) {
          console.log(`✅ Successfully updated displayName in Users collection to: ${(data as any).displayName}`);
        }
      })
      .catch(error => {
        console.error(`Error updating document in ${collectionName} with ID ${id}:`, error);
        throw error;
      });
  }

  /**
   * Delete a document by ID from specified collection
   * @param collectionName The collection name
   * @param id The document ID
   * @returns Promise resolving when deletion completes
   */
  Delete(collectionName: string, id: string): Promise<void> {
    console.log(`Deleting document from ${collectionName} with ID: ${id}`);
    
    if (!id) {
      const error = new Error('Document ID is required for deletion');
      console.error(`Delete failed: ${error.message}`);
      return Promise.reject(error);
    }
    
    return this.firestore.collection(collectionName).doc(id).delete()
      .then(() => {
        console.log(`Successfully deleted document from ${collectionName} with ID: ${id}`);
      })
      .catch(error => {
        console.error(`Error deleting document from ${collectionName} with ID: ${id}:`, error);
        throw error;
      });
  }

  /**
   * Set a document with a specific ID (creates or overwrites)
   * @param collectionName The collection name
   * @param id The document ID
   * @param data The data to set
   * @param merge Whether to merge with existing data
   * @returns Promise resolving when set completes
   */
  Set<T>(collectionName: string, id: string, data: T, merge: boolean = true): Promise<void> {
    console.log(`Setting document in ${collectionName} with ID ${id}:`, data);
    
    // Special logging for displayName updates to track them better
    if (collectionName === 'Users' && (data as any).displayName) {
      console.log(`⭐ Setting displayName in Users collection to: ${(data as any).displayName}`);
    }
    
    if (!id) {
      const error = new Error('Document ID is required for set operation');
      console.error(`Set failed: ${error.message}`);
      return Promise.reject(error);
    }
    
    return this.firestore.collection<T>(collectionName).doc(id).set(data, { merge })
      .then(() => {
        console.log(`Successfully set document in ${collectionName} with ID ${id}`);
        
        // Special confirmation for displayName updates
        if (collectionName === 'Users' && (data as any).displayName) {
          console.log(`✅ Successfully set displayName in Users collection to: ${(data as any).displayName}`);
        }
      })
      .catch(error => {
        console.error(`Error setting document in ${collectionName} with ID ${id}:`, error);
        throw error;
      });
  }

  /**
   * Create a document with a specific ID
   * @param collectionName The collection name
   * @param id The document ID
   * @param data The data to store
   * @returns Promise resolving when creation completes
   */
  CreateWithId<T>(collectionName: string, id: string, data: T): Promise<void> {
    console.log(`Creating document in ${collectionName} with ID ${id}:`, data);
    
    if (!id) {
      const error = new Error('Document ID is required for creation with ID');
      console.error(`CreateWithId failed: ${error.message}`);
      return Promise.reject(error);
    }
    
    return this.firestore.collection<T>(collectionName).doc(id).set(data)
      .then(() => {
        console.log(`Successfully created document in ${collectionName} with ID ${id}`);
      })
      .catch(error => {
        console.error(`Error creating document in ${collectionName} with ID ${id}:`, error);
        throw error;
      });
  }

  /**
   * Get a document reference
   * @param collectionName The collection name
   * @param id The document ID
   * @returns Firebase document reference
   */
  getDocRef(collectionName: string, id: string): firebase.firestore.DocumentReference {
    return firebase.firestore().collection(collectionName).doc(id);
  }

  /**
   * Direct update of User displayName in the Users collection
   * This bypasses potential injection issues by using the native firebase API
   */
  updateUserDisplayName(userId: string, displayName: string): Promise<void> {
    console.log(`⭐ Directly updating Users collection displayName for ${userId} to: ${displayName}`);
    
    if (!userId) {
      const error = new Error('User ID is required');
      console.error(`Update failed: ${error.message}`);
      return Promise.reject(error);
    }
    
    // Use native Firebase API directly to avoid injection issues
    return firebase.firestore().collection('Users').doc(userId).set(
      { 
        displayName: displayName,
        updatedAt: new Date().toISOString() 
      }, 
      { merge: true }
    ).then(() => {
      console.log(`✅ Successfully updated displayName in Users collection to: ${displayName}`);
    }).catch(error => {
      console.error(`❌ Error updating displayName in Users collection:`, error);
      throw error;
    });
  }
}
