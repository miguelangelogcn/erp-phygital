// src/lib/firebase/services/metaReports.ts
import { collection, getDocs, query, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { MetaCampaign } from "@/types/metaCampaign";

/**
 * Fetches all meta campaigns for a specific client from Firestore.
 * @param {string} clientId - The ID of the client.
 * @returns {Promise<MetaCampaign[]>} A promise that resolves to an array of campaign objects.
 */
export async function getMetaCampaigns(clientId: string): Promise<MetaCampaign[]> {
  if (!clientId) {
    console.error("Client ID is required to fetch meta campaigns.");
    return [];
  }
  try {
    const campaignsCollectionRef = collection(db, "clients", clientId, "metaCampaigns");
    const q = query(campaignsCollectionRef, orderBy("spend", "desc"));
    const campaignsSnapshot = await getDocs(q);
    
    if (campaignsSnapshot.empty) {
        console.log(`No meta campaigns found for client ${clientId}`);
        return [];
    }
    
    const campaignsList = campaignsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    })) as MetaCampaign[];
    
    return campaignsList;
  } catch (error) {
    console.error(`Error fetching meta campaigns for client ${clientId}: `, error);
    throw new Error("Failed to fetch meta campaigns from Firestore.");
  }
}
