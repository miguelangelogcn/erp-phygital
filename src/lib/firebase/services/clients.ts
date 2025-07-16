// src/lib/firebase/services/clients.ts
import { collection, getDocs, orderBy, query, addDoc, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Client, NewClient } from "@/types/client";

/**
 * Fetches all clients from the 'clients' collection in Firestore, ordered by name.
 * @returns {Promise<Client[]>} A promise that resolves to an array of client objects.
 */
export async function getClients(): Promise<Client[]> {
  try {
    const clientsCollection = collection(db, "clients");
    const q = query(clientsCollection, orderBy("name"));
    const clientsSnapshot = await getDocs(q);
    const clientsList = clientsSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as Client[];
    return clientsList;
  } catch (error) {
    console.error("Error fetching clients: ", error);
    throw new Error("Failed to fetch clients from Firestore.");
  }
}

/**
 * Fetches a single client by its ID from Firestore.
 * @param {string} id - The ID of the client document to fetch.
 * @returns {Promise<Client | null>} A promise that resolves to the client object or null if not found.
 */
export async function getClientById(id: string): Promise<Client | null> {
  try {
    const clientDocRef = doc(db, "clients", id);
    const clientDocSnap = await getDoc(clientDocRef);

    if (clientDocSnap.exists()) {
      return { id: clientDocSnap.id, ...clientDocSnap.data() } as Client;
    } else {
      console.log("No such client!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching client by ID: ", error);
    throw new Error("Failed to fetch client from Firestore.");
  }
}


/**
 * Adds a new client to the 'clients' collection in Firestore.
 * @param {NewClient} clientData - The data for the new client.
 * @returns {Promise<string>} A promise that resolves to the new document's ID.
 */
export async function addClient(clientData: NewClient): Promise<string> {
    try {
        const clientsCollection = collection(db, "clients");
        const docRef = await addDoc(clientsCollection, clientData);
        return docRef.id;
    } catch (error) {
        console.error("Error adding client: ", error);
        throw new Error("Failed to add client to Firestore.");
    }
}