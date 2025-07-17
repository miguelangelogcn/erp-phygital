// src/lib/firebase/services/teams.ts
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
import type { Team, NewTeam } from "@/types/team";

/**
 * Fetches all teams from the 'teams' collection, ordered by name.
 * @returns {Promise<Team[]>} A promise that resolves to an array of team objects.
 */
export async function getTeams(): Promise<Team[]> {
  try {
    const teamsCollection = collection(db, "teams");
    const q = query(teamsCollection, orderBy("name"));
    const teamsSnapshot = await getDocs(q);
    const teamsList = teamsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as Team[];
    return teamsList;
  } catch (error) {
    console.error("Error fetching teams: ", error);
    throw new Error("Failed to fetch teams from Firestore.");
  }
}

/**
 * Adds a new team to the 'teams' collection.
 * @param {NewTeam} teamData - The data for the new team.
 * @returns {Promise<string>} A promise that resolves to the new document's ID.
 */
export async function addTeam(teamData: NewTeam): Promise<string> {
  try {
    const docRef = await addDoc(collection(db, "teams"), teamData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding team: ", error);
    throw new Error("Failed to add team to Firestore.");
  }
}

/**
 * Updates an existing team in Firestore.
 * @param {string} teamId - The ID of the team to update.
 * @param {Partial<NewTeam>} teamData - An object with the fields to update.
 */
export async function updateTeam(teamId: string, teamData: Partial<NewTeam>): Promise<void> {
  try {
    const teamDocRef = doc(db, "teams", teamId);
    await updateDoc(teamDocRef, teamData);
  } catch (error) {
    console.error("Error updating team: ", error);
    throw new Error("Failed to update team in Firestore.");
  }
}

/**
 * Deletes a team from Firestore.
 * @param {string} teamId - The ID of the team to delete.
 */
export async function deleteTeam(teamId: string): Promise<void> {
  try {
    const teamDocRef = doc(db, "teams", teamId);
    await deleteDoc(teamDocRef);
  } catch (error) {
    console.error("Error deleting team: ", error);
    throw new Error("Failed to delete team.");
  }
}
