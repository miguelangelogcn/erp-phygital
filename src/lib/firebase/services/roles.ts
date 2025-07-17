// src/lib/firebase/services/roles.ts
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Role, NewRole } from "@/types/role";

/**
 * Fetches all roles from the 'roles' collection, ordered by name.
 * @returns {Promise<Role[]>} A promise that resolves to an array of role objects.
 */
export async function getRoles(): Promise<Role[]> {
  try {
    const rolesCollection = collection(db, "roles");
    const q = query(rolesCollection, orderBy("name"));
    const rolesSnapshot = await getDocs(q);
    const rolesList = rolesSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Role[];
    return rolesList;
  } catch (error) {
    console.error("Error fetching roles: ", error);
    throw new Error("Failed to fetch roles from Firestore.");
  }
}

/**
 * Adds a new role to the 'roles' collection.
 * @param {NewRole} roleData - The data for the new role.
 * @returns {Promise<string>} A promise that resolves to the new document's ID.
 */
export async function addRole(roleData: NewRole): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "roles"), roleData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding role: ", error);
    throw new Error("Failed to add role to Firestore.");
  }
}

/**
 * Updates an existing role in Firestore.
 * @param {string} roleId - The ID of the role to update.
 * @param {Partial<NewRole>} roleData - An object with the fields to update.
 */
export async function updateRole(roleId: string, roleData: Partial<NewRole>): Promise<void> {
  try {
    const roleDocRef = doc(db, "roles", roleId);
    await updateDoc(roleDocRef, roleData);
  } catch (error) {
    console.error("Error updating role: ", error);
    throw new Error("Failed to update role in Firestore.");
  }
}

/**
 * Deletes a role from Firestore.
 * @param {string} roleId - The ID of the role to delete.
 */
export async function deleteRole(roleId: string): Promise<void> {
  try {
    const roleDocRef = doc(db, "roles", roleId);
    await deleteDoc(roleDocRef);
  } catch (error) {
    console.error("Error deleting role: ", error);
    throw new Error("Failed to delete role.");
  }
}
