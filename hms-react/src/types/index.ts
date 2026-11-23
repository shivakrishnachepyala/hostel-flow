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
  Hostel_Name?: string;
  Hostel_Type?: string;
  Total_Rooms?: number;
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
  Block_Name?: string;
  Block_Gender?: string;
  Hostel_ID?: number;
  Hostel_Name?: string;
  Occupied_Beds?: number;
  Total_Beds?: number;
}

export interface RoomWithOccupancy extends Room {
  totalBeds: number;
  occupiedBeds: number;
  availableBeds: number;
  maintenanceBeds?: number;
  status: 'available' | 'occupied' | 'partially-occupied' | 'fully-occupied' | 'maintenance' | string;
}

export interface Bed {
  Bed_ID: number;
  Bed_Number: string;
  Bed_Type: string | null;
  Bed_Status: 'Available' | 'Occupied' | 'Maintenance' | string | null;
  Room_ID: number;
  Room_Number?: string;
  Floor?: number;
  Room_Type?: string;
  Block_Name?: string;
  Hostel_Name?: string;
  Occupant_Student_ID?: number | null;
  Occupant_Name?: string | null;
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
  Allocation_ID?: number | null;
  Allocation_Status?: string | null;
  Room_ID?: number | null;
  Room_Number?: string | null;
  Bed_ID?: number | null;
  Bed_Number?: string | null;
  Block_Name?: string | null;
  Hostel_Name?: string | null;
}

export interface StudentPreferences {
  Preference_ID: number;
  Student_ID: number;
  Language: string | null;
  Food_Preference: string | null;
  Sleep_Schedule: string | null;
  Study_Habits: string | null;
  Student_Name?: string;
  Student_Dept?: string;
  Student_Gender?: string;
}

export interface RoomAllocation {
  Allocation_ID: number;
  Student_ID?: number;
  Room_ID: number;
  Bed_ID: number;
  Allocation_Date: string;
  Start_Date: string;
  End_Date: string | null;
  Allocation_Status: 'Active' | 'Completed' | 'Cancelled' | string | null;
  Student_Name?: string;
  Student_Dept?: string;
  Student_Email?: string;
  Room_Number?: string;
  Room_Floor?: number;
  Room_Type?: string;
  Bed_Number?: string;
  Block_Name?: string;
  Hostel_Name?: string;
}

export interface MatchScoreDimension {
  score: number;
  weight: number;
  detail: string;
}

export interface MatchExplanationBreakdown {
  total_score: number;
  sleep: MatchScoreDimension;
  study: MatchScoreDimension;
  food: MatchScoreDimension;
  language: MatchScoreDimension;
  summary?: string;
  gender?: string;
  same_department?: boolean;
}

export interface StudentPrefSummary {
  Sleep_Schedule?: string | null;
  Study_Habits?: string | null;
  Food_Preference?: string | null;
  Language?: string | null;
}

export interface RoommateMatch {
  Match_ID: number;
  Student_ID_1: number;
  Student_ID_2: number;
  Compatibility_Score: number | null;
  Match_Date: string | null;
  Match_Status: 'Proposed' | 'Accepted' | 'Approved' | 'Rejected' | string | null;
  Match_Explanation?: MatchExplanationBreakdown | null;
  // Joined student attributes
  Student_1_Name?: string;
  Student_1_Gender?: string;
  Student_1_Department?: string;
  Student_1_Year?: number;
  Student_1_Preferences?: StudentPrefSummary;
  Student_2_Name?: string;
  Student_2_Gender?: string;
  Student_2_Department?: string;
  Student_2_Year?: number;
  Student_2_Preferences?: StudentPrefSummary;
  Created_At?: string;
  Updated_At?: string;
}

export interface RoommateMatchStats {
  total_matches: number;
  proposed_count: number;
  approved_count: number;
  rejected_count: number;
  average_score: number;
  eligible_unmatched_count: number;
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
  Student_Name?: string;
  Student_Dept?: string;
  Student_Email?: string;
}

export interface AvailableRoomOption {
  Room_ID: number;
  Room_Number: string;
  Floor: number | null;
  Room_Type: string | null;
  Capacity: number;
  Facilities: string | null;
  Block_ID: number;
  Block_Name: string;
  Block_Gender: string | null;
  Hostel_ID: number;
  Hostel_Name: string;
  Hostel_Type: string | null;
  student_occupancy: number;
  guest_occupancy: number;
  total_occupancy: number;
  available_capacity: number;
  is_available: boolean;
  is_currently_assigned: boolean;
  active_reservations: string | null;
  matches_preference: boolean;
}

export interface GuestStay {
  Guest_ID: number;
  Reference_No: string;
  Guest_Name: string;
  Email: string;
  Phone: string;
  Purpose: string;
  Student_Reference: string | null;
  Student_ID: number | null;
  Check_In_Date: string;
  Check_Out_Date: string;
  Guest_Count: number;
  Room_Preference: string;
  Assigned_Room_ID: number | null;
  Special_Requests: string | null;
  Status: 'Pending' | 'Approved' | 'Rejected' | 'Cancelled';
  Check_In_Status: 'Pending' | 'Checked-In' | 'Checked-Out' | 'No-Show';
  Actual_Check_In: string | null;
  Actual_Check_Out: string | null;
  Rejection_Reason: string | null;
  Admin_Remarks: string | null;
  Approved_By: number | null;
  Approved_At: string | null;
  Created_At: string;
  Updated_At: string;
  Approved_By_Name?: string | null;
  Approved_By_Role?: string | null;
  Assigned_Room_Number?: string | null;
  Assigned_Room_Type?: string | null;
  Assigned_Room_Floor?: number | null;
  Assigned_Room_Capacity?: number | null;
  Assigned_Room_Facilities?: string | null;
  Assigned_Block_Name?: string | null;
  Assigned_Hostel_Name?: string | null;
  Matched_Student_Name?: string | null;
  Matched_Student_Phone?: string | null;
  Matched_Student_Email?: string | null;
  Matched_Student_Dept?: string | null;
  Matched_Student_Year?: number | null;
}

export interface GuestStats {
  totalRequests: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  roomAssignedCount?: number;
  unassignedApprovedCount?: number;
  checkedInGuests: number;
  checkedOutGuests: number;
}

export interface HostelBuildingModel {
  id: string;
  name: string;
  floorsCount: number;
  wingsCount: number;
  isIllustrative: boolean;
}
