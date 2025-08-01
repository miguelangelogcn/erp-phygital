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
import type { NewCalendarEvent, EventChecklistItem } from "@/types/calendarEvent";

/**
 * Adds a new event to the 'calendarEvents' collection in Firestore.
 * @param {NewCalendarEvent} eventData - The data for the new event.
 * @returns {Promise<string>} The ID of the newly created document.
 */
export async function addCalendarEvent(eventData: NewCalendarEvent): Promise<string> {
    try {
        const docRef = await addDoc(collection(db, "calendarEvents"), {
            ...eventData,
            createdAt: serverTimestamp()
        });
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
 * Updates just the checklist for a calendar event.
 * @param {string} eventId - The ID of the event.
 * @param {EventChecklistItem[]} checklist - The new checklist array.
 * @returns {Promise<void>}
 */
export async function updateEventChecklist(eventId: string, checklist: EventChecklistItem[]): Promise<void> {
    try {
        const eventDocRef = doc(db, "calendarEvents", eventId);
        await updateDoc(eventDocRef, { checklist });
    } catch (error) {
        console.error("Error updating event checklist: ", error);
        throw new Error("Failed to update event checklist.");
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
