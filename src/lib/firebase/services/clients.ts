// src/lib/firebase/services/clients.ts
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Client } from "@/types/client";

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