import { collection, getDocs } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { User } from "@/types/user";

/**
 * Fetches all users from the 'users' collection in Firestore.
 * @returns {Promise<User[]>} A promise that resolves to an array of user objects.
 */
export async function getUsers(): Promise<User[]> {
  try {
    const usersCollection = collection(db, "users");
    const usersSnapshot = await getDocs(usersCollection);
    const usersList = usersSnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    })) as User[];
    return usersList;
  } catch (error) {
    console.error("Error fetching users: ", error);
    throw new Error("Failed to fetch users from Firestore.");
  }
}
