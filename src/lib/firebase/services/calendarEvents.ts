// src/lib/firebase/services/calendarEvents.ts
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "firebase/firestore";
import { db, functions } from "@/lib/firebase/config";
import type { NewCalendarEvent } from "@/types/calendarEvent";
import { httpsCallable } from "firebase/functions";

const createCalendarEventCallable = httpsCallable(functions, 'createCalendarEventWithNotifications');

/**
 * Adds a new event by calling a Cloud Function.
 * @param {NewCalendarEvent} eventData - The data for the new event.
 * @returns {Promise<string>} The ID of the newly created event.
 */
export async function addCalendarEvent(eventData: NewCalendarEvent): Promise<string> {
  try {
    const result: any = await createCalendarEventCallable(eventData);
    if (result.data.success) {
        return result.data.id;
    } else {
        throw new Error("Failed to create calendar event via Cloud Function.");
    }
  } catch (error) {
    console.error("Error calling createCalendarEventWithNotifications function: ", error);
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
    await updateDoc(eventDocRef, {
        ...eventData,
        updatedAt: serverTimestamp()
    });
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
