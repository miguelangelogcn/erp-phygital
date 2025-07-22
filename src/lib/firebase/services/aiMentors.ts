// src/lib/firebase/services/aiMentors.ts
import {
  collection,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { AiMentor, NewAiMentor } from "@/types/aiMentor";

const MENTORS_COLLECTION = "aiMentors";

/**
 * Fetches all mentors from the 'aiMentors' collection, ordered by name.
 * @returns {Promise<AiMentor[]>} A promise that resolves to an array of mentor objects.
 */
export async function getMentors(): Promise<AiMentor[]> {
  try {
    const mentorsCollection = collection(db, MENTORS_COLLECTION);
    const q = query(mentorsCollection, orderBy("name"));
    const mentorsSnapshot = await getDocs(q);
    const mentorsList = mentorsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as AiMentor[];
    return mentorsList;
  } catch (error) {
    console.error("Error fetching mentors: ", error);
    throw new Error("Failed to fetch mentors from Firestore.");
  }
}

/**
 * Fetches a single mentor by its ID.
 * @param {string} mentorId - The ID of the mentor to fetch.
 * @returns {Promise<AiMentor | null>} A promise that resolves to the mentor object or null if not found.
 */
export async function getMentorById(mentorId: string): Promise<AiMentor | null> {
    try {
        const mentorDocRef = doc(db, MENTORS_COLLECTION, mentorId);
        const mentorDocSnap = await getDoc(mentorDocRef);

        if (mentorDocSnap.exists()) {
            return { id: mentorDocSnap.id, ...mentorDocSnap.data() } as AiMentor;
        } else {
            return null;
        }
    } catch (error) {
        console.error(`Error fetching mentor ${mentorId}: `, error);
        throw new Error("Failed to fetch mentor.");
    }
}


/**
 * Adds a new mentor to the 'aiMentors' collection.
 * @param {NewAiMentor} mentorData - The data for the new mentor.
 * @returns {Promise<string>} A promise that resolves to the new document's ID.
 */
export async function addMentor(mentorData: NewAiMentor): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, MENTORS_COLLECTION), mentorData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding mentor: ", error);
    throw new Error("Failed to add mentor to Firestore.");
  }
}

/**
 * Updates an existing mentor in Firestore.
 * @param {string} mentorId - The ID of the mentor to update.
 * @param {Partial<NewAiMentor>} mentorData - An object with the fields to update.
 */
export async function updateMentor(mentorId: string, mentorData: Partial<NewAiMentor>): Promise<void> {
  try {
    const mentorDocRef = doc(db, MENTORS_COLLECTION, mentorId);
    await updateDoc(mentorDocRef, mentorData);
  } catch (error)_
 {
    console.error("Error updating mentor: ", error);
    throw new Error("Failed to update mentor in Firestore.");
  }
}

/**
 * Deletes a mentor from Firestore.
 * @param {string} mentorId - The ID of the mentor to delete.
 */
export async function deleteMentor(mentorId: string): Promise<void> {
  try {
    const mentorDocRef = doc(db, MENTORS_COLLECTION, mentorId);
    await deleteDoc(mentorDocRef);
  } catch (error) {
    console.error("Error deleting mentor: ", error);
    throw new Error("Failed to delete mentor.");
  }
}
