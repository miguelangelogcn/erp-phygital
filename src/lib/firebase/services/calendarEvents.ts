// src/lib/firebase/services/calendarEvents.ts
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { NewCalendarEvent } from "@/types/calendarEvent";

const eventsCollection = collection(db, "calendarEvents");

/**
 * Adds a new event to the 'calendarEvents' collection.
 * @param {NewCalendarEvent} eventData - The data for the new event.
 * @returns {Promise<string>} The ID of the newly created event.
 */
export async function addCalendarEvent(eventData: NewCalendarEvent): Promise<string> {
  try {
    const docRef = await addDoc(eventsCollection, eventData);
    return docRef.id;
  } catch (error) {
    console.error("Error adding calendar event: ", error);
    throw new Error("Failed to add calendar event.");
  }
}

/**
 * Updates an existing event in the 'calendarEvents' collection.
 * @param {string} eventId - The ID of the event to update.
 * @param {Partial<NewCalendarEvent>} eventData - An object with the fields to update.
 * @returns {Promise<void>}
 */
export async function updateCalendarEvent(eventId: string, eventData: Partial<NewCalendarEvent>): Promise<void> {
  try {
    const eventDocRef = doc(db, "calendarEvents", eventId);
    await updateDoc(eventDocRef, eventData);
  } catch (error) {
    console.error("Error updating calendar event: ", error);
    throw new Error("Failed to update calendar event.");
  }
}

/**
 * Deletes an event from the 'calendarEvents' collection.
 * @param {string} eventId - The ID of the event to delete.
 * @returns {Promise<void>}
 */
export async function deleteCalendarEvent(eventId: string): Promise<void> {
  try {
    const eventDocRef = doc(db, "calendarEvents", eventId);
    await deleteDoc(eventDocRef);
  } catch (error) {
    console.error("Error deleting calendar event: ", error);
    throw new Error("Failed to delete calendar event.");
  }
}
