/**
 * MySQL hms Database Entities
 * Corresponds exactly to the 9 existing database tables.
 */

export interface Hostel {
  Hostel_ID: number;
  Hostel_Name: string;
  Location: string | null;
  Capacity: number | null;
  Hostel_Type: 'Boys' | 'Girls' | 'Co-ed' | string | null;
}

export interface HostelBlock {
  Block_ID: number;
  Block_Name: string;
  Gender: 'Male' | 'Female' | string | null;
  Capacity: number | null;
  Hostel_ID: number;
}

export interface Room {
  Room_ID: number;
  Room_Number: string;
  Floor: number | null;
  Room_Type: string | null; // e.g. 'Single', 'Double', 'Triple'
  Capacity: number | null;
  Facilities: string | null;
  Layout_Data: string | null;
  Block_ID: number;
}

export interface Bed {
  Bed_ID: number;
  Bed_Number: string;
  Bed_Type: string | null;
  Bed_Status: 'Available' | 'Occupied' | 'Maintenance' | string | null;
  Room_ID: number;
}

export interface Student {
  Student_ID: number;
  Name: string;
  Gender: string | null;
  DOB: string | null;
  Phone: string | null;
  Email: string | null;
  Department: string | null;
  Year_of_Study: number | null;
}

export interface StudentPreferences {
  Preference_ID: number;
  Student_ID: number;
  Language: string | null;
  Food_Preference: string | null;
  Sleep_Schedule: string | null;
  Study_Habits: string | null;
}

export interface RoomAllocation {
  Allocation_ID: number;
  Student_ID: number;
  Room_ID: number;
  Bed_ID: number;
  Allocation_Date: string;
  Start_Date: string;
  End_Date: string | null;
  Allocation_Status: 'Active' | 'Completed' | 'Cancelled' | string | null;
}

export interface RoommateMatch {
  Match_ID: number;
  Student_ID_1: number;
  Student_ID_2: number;
  Compatibility_Score: number | null;
  Match_Date: string | null;
  Match_Status: 'Proposed' | 'Accepted' | 'Rejected' | string | null;
}

export interface Payment {
  Payment_ID: number;
  Student_ID: number;
  Amount: number;
  Payment_Date: string | null;
  Payment_Method: string | null;
  Payment_Status: 'Paid' | 'Pending' | 'Failed' | string | null;
  Payment_Type: string | null;
  Transaction_Reference: string | null;
}

/**
 * 3D Explorer & Application Types
 */
export type RoomAvailabilityStatus = 'available' | 'partially-occupied' | 'fully-occupied' | 'maintenance';

export interface RoomWithOccupancy extends Room {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  maintenanceBeds: number;
  status: RoomAvailabilityStatus;
  beds?: Bed[];
}

export interface FloorOverview {
  floorNumber: number;
  floorLabel: string;
  totalRooms: number;
  availableRooms: number;
  totalBeds: number;
  vacantBeds: number;
}

export interface HostelBuildingModel {
  id: string;
  name: string;
  floorsCount: number;
  wingsCount: number;
  isIllustrative: boolean;
}
