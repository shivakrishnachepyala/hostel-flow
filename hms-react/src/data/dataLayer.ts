/**
 * Hostel Management System - Data Layer
 * 
 * "Sample data, not connected to MySQL yet"
 * 
 * Strict Architecture Rules:
 * - Frontend-only in-memory storage
 * - Preserve list(table), insert(table, row), update(table, id, patch), remove(table, id)
 * - Preserve all existing table and column names
 */
import { apiClient } from '../services/apiClient';

export interface Hostel {
  Hostel_ID: number;
  Hostel_Name: string;
  Location: string;
  Capacity: number;
  Hostel_Type: 'Boys' | 'Girls' | 'Co-ed' | string;
}

export interface HostelBlock {
  Block_ID: number;
  Block_Name: string;
  Gender: 'Male' | 'Female' | string;
  Capacity: number;
  Hostel_ID: number;
}

export interface Room {
  Room_ID: number;
  Room_Number: string;
  Floor: number;
  Room_Type: string;
  Capacity: number;
  Facilities: string;
  Layout_Data: string;
  Block_ID: number;
}

export interface Bed {
  Bed_ID: number;
  Bed_Number: string;
  Bed_Type: string;
  Bed_Status: 'Available' | 'Occupied' | 'Maintenance' | string;
  Room_ID: number;
}

export interface Student {
  Student_ID: number;
  Name: string;
  Gender: 'Male' | 'Female' | 'Other' | string;
  DOB: string;
  Phone: string;
  Email: string;
  Department: string;
  Year_of_Study: number;
}

export interface StudentPreferences {
  Preference_ID: number;
  Student_ID: number;
  Language: string;
  Food_Preference: string;
  Sleep_Schedule: string;
  Study_Habits: string;
}

export interface RoomAllocation {
  Allocation_ID: number;
  Student_ID: number;
  Room_ID: number;
  Bed_ID: number;
  Allocation_Date: string;
  Start_Date: string;
  End_Date: string | null;
  Allocation_Status: 'Active' | 'Completed' | 'Cancelled' | string;
}

export interface RoommateMatch {
  Match_ID: number;
  Student_ID_1: number;
  Student_ID_2: number;
  Compatibility_Score: number | string;
  Match_Date: string;
  Match_Status: 'Proposed' | 'Accepted' | 'Rejected' | string;
}

export interface Payment {
  Payment_ID: number;
  Student_ID: number;
  Amount: number | string;
  Payment_Date: string | null;
  Payment_Method: string | null;
  Payment_Status: 'Paid' | 'Pending' | 'Failed' | string;
  Payment_Type: string;
  Transaction_Reference: string | null;
}

export type TableName =
  | 'hostel'
  | 'hostel_block'
  | 'room'
  | 'bed'
  | 'student'
  | 'student_preferences'
  | 'room_allocation'
  | 'roommate_match'
  | 'payment';

export const STATUS_LABEL = "Sample data, not connected to MySQL yet";

export const PK: Record<TableName, string> = {
  hostel: 'Hostel_ID',
  hostel_block: 'Block_ID',
  room: 'Room_ID',
  bed: 'Bed_ID',
  student: 'Student_ID',
  student_preferences: 'Preference_ID',
  room_allocation: 'Allocation_ID',
  roommate_match: 'Match_ID',
  payment: 'Payment_ID',
};

const REFS: Partial<Record<TableName, [TableName, string][]>> = {
  hostel: [['hostel_block', 'Hostel_ID']],
  hostel_block: [['room', 'Block_ID']],
  room: [['bed', 'Room_ID'], ['room_allocation', 'Room_ID']],
  bed: [['room_allocation', 'Bed_ID']],
  student: [
    ['student_preferences', 'Student_ID'],
    ['room_allocation', 'Student_ID'],
    ['roommate_match', 'Student_ID_1'],
    ['roommate_match', 'Student_ID_2'],
    ['payment', 'Student_ID'],
  ],
};

function seedDatabase() {
  const d: {
    hostel: Hostel[];
    hostel_block: HostelBlock[];
    room: Room[];
    bed: Bed[];
    student: Student[];
    student_preferences: StudentPreferences[];
    room_allocation: RoomAllocation[];
    roommate_match: RoommateMatch[];
    payment: Payment[];
  } = {
    hostel: [],
    hostel_block: [],
    room: [],
    bed: [],
    student: [],
    student_preferences: [],
    room_allocation: [],
    roommate_match: [],
    payment: [],
  };

  d.hostel = [
    { Hostel_ID: 1, Hostel_Name: 'Aryabhatta Hostel', Location: 'North Campus', Capacity: 0, Hostel_Type: 'Boys' },
    { Hostel_ID: 2, Hostel_Name: 'Gargi Hostel', Location: 'South Campus', Capacity: 0, Hostel_Type: 'Girls' },
  ];

  let blockId = 1, roomId = 1, bedId = 1;
  d.hostel.forEach(h => {
    ['A', 'B'].forEach(letter => {
      const b: HostelBlock = {
        Block_ID: blockId++,
        Block_Name: 'Block ' + letter,
        Gender: h.Hostel_Type === 'Boys' ? 'Male' : 'Female',
        Capacity: 0,
        Hostel_ID: h.Hostel_ID,
      };
      d.hostel_block.push(b);
      [1, 2].forEach(floor => {
        [1, 2].forEach(n => {
          const cap = (floor + n) % 2 === 0 ? 3 : 2;
          const r: Room = {
            Room_ID: roomId++,
            Room_Number: `${h.Hostel_Name[0]}${letter}-${floor}0${n}`,
            Floor: floor,
            Room_Type: cap === 3 ? 'Triple' : 'Double',
            Capacity: cap,
            Facilities: 'Wi-Fi, Attached bathroom, Study Desk',
            Layout_Data: 'Rectangular, window facing east',
            Block_ID: b.Block_ID,
          };
          d.room.push(r);
          b.Capacity += cap;
          h.Capacity += cap;
          for (let i = 1; i <= cap; i++) {
            d.bed.push({
              Bed_ID: bedId++,
              Bed_Number: `${r.Room_Number}-B${i}`,
              Bed_Type: 'Single',
              Bed_Status: 'Available',
              Room_ID: r.Room_ID,
            });
          }
        });
      });
    });
  });

  const studentsData: [string, string, string, string, string, string, number][] = [
    ['Aarav Sharma', 'Male', '2005-03-14', '9810000001', 'aarav.sharma@example.edu', 'Computer Science', 2],
    ['Rohan Verma', 'Male', '2005-07-02', '9810000002', 'rohan.verma@example.edu', 'Electronics', 2],
    ['Kabir Singh', 'Male', '2004-11-21', '9810000003', 'kabir.singh@example.edu', 'Mechanical', 3],
    ['Ananya Gupta', 'Female', '2005-01-30', '9810000004', 'ananya.gupta@example.edu', 'Computer Science', 2],
    ['Diya Mehta', 'Female', '2005-05-18', '9810000005', 'diya.mehta@example.edu', 'Civil', 2],
    ['Ishaan Kapoor', 'Male', '2003-09-09', '9810000006', 'ishaan.kapoor@example.edu', 'Electronics', 4],
    ['Meera Nair', 'Female', '2006-02-11', '9810000007', 'meera.nair@example.edu', 'Computer Science', 1],
    ['Vivaan Joshi', 'Male', '2006-04-25', '9810000008', 'vivaan.joshi@example.edu', 'Civil', 1],
    ['Saanvi Rao', 'Female', '2004-12-05', '9810000009', 'saanvi.rao@example.edu', 'Mechanical', 3],
    ['Arjun Malhotra', 'Male', '2005-08-16', '9810000010', 'arjun.malhotra@example.edu', 'Computer Science', 2],
  ];

  studentsData.forEach((s, i) => {
    d.student.push({
      Student_ID: i + 1,
      Name: s[0],
      Gender: s[1],
      DOB: s[2],
      Phone: s[3],
      Email: s[4],
      Department: s[5],
      Year_of_Study: s[6],
    });
  });

  const prefs: [string, string, string, string][] = [
    ['English, Hindi', 'Vegetarian', 'Early riser', 'Studies in room'],
    ['Hindi', 'Non-vegetarian', 'Night owl', 'Studies in library'],
    ['English, Punjabi', 'Vegetarian', 'Early riser', 'Studies in room'],
    ['English, Hindi', 'Vegetarian', 'Early riser', 'Studies in library'],
    ['Hindi, Gujarati', 'Non-vegetarian', 'Night owl', 'Studies in room'],
    ['English', 'Non-vegetarian', 'Night owl', 'Studies in library'],
  ];

  prefs.forEach((p, i) => {
    d.student_preferences.push({
      Preference_ID: i + 1,
      Student_ID: i + 1,
      Language: p[0],
      Food_Preference: p[1],
      Sleep_Schedule: p[2],
      Study_Habits: p[3],
    });
  });

  const bedsOfBlock = (id: number) => d.bed.filter(b => d.room.find(r => r.Room_ID === b.Room_ID)?.Block_ID === id);
  const alloc = (studentId: number, bed: Bed, status: string, aDate: string, sDate: string, eDate: string | null) => {
    d.room_allocation.push({
      Allocation_ID: d.room_allocation.length + 1,
      Student_ID: studentId,
      Room_ID: bed.Room_ID,
      Bed_ID: bed.Bed_ID,
      Allocation_Date: aDate,
      Start_Date: sDate,
      End_Date: eDate,
      Allocation_Status: status,
    });
    if (status === 'Active') bed.Bed_Status = 'Occupied';
  };

  const boys = bedsOfBlock(1);
  const girls = bedsOfBlock(3);
  const oldBed = bedsOfBlock(2)[0];

  if (boys[0]) alloc(1, boys[0], 'Active', '2026-07-20', '2026-08-01', null);
  if (boys[1]) alloc(2, boys[1], 'Active', '2026-07-20', '2026-08-01', null);
  if (boys[2]) alloc(3, boys[2], 'Active', '2026-07-21', '2026-08-01', null);
  if (girls[0]) alloc(4, girls[0], 'Active', '2026-07-22', '2026-08-01', null);
  if (girls[1]) alloc(5, girls[1], 'Active', '2026-07-22', '2026-08-01', null);
  if (oldBed) alloc(6, oldBed, 'Completed', '2025-07-15', '2025-08-01', '2026-06-30');

  const matchesData: [number, number, number, string, string][] = [
    [1, 2, 86.5, '2026-07-25', 'Accepted'],
    [4, 5, 78.0, '2026-07-26', 'Accepted'],
    [3, 6, 64.25, '2026-07-27', 'Proposed'],
  ];

  matchesData.forEach((m, i) => {
    d.roommate_match.push({
      Match_ID: i + 1,
      Student_ID_1: m[0],
      Student_ID_2: m[1],
      Compatibility_Score: m[2],
      Match_Date: m[3],
      Match_Status: m[4],
    });
  });

  const paymentData: [number, number, string | null, string | null, string, string, string | null][] = [
    [1, 45000, '2026-07-28', 'UPI', 'Paid', 'Hostel Fee', 'TXN-1001'],
    [2, 45000, '2026-07-29', 'Card', 'Paid', 'Hostel Fee', 'TXN-1002'],
    [3, 45000, null, null, 'Pending', 'Hostel Fee', null],
    [4, 45000, '2026-07-30', 'UPI', 'Paid', 'Hostel Fee', 'TXN-1004'],
    [5, 10000, '2026-07-30', 'Cash', 'Paid', 'Security Deposit', 'TXN-1005'],
    [1, 10000, '2026-07-28', 'UPI', 'Paid', 'Security Deposit', 'TXN-1006'],
    [6, 45000, '2025-07-30', 'Card', 'Paid', 'Hostel Fee', 'TXN-0901'],
    [2, 10000, null, null, 'Pending', 'Security Deposit', null],
  ];

  paymentData.forEach((p, i) => {
    d.payment.push({
      Payment_ID: i + 1,
      Student_ID: p[0],
      Amount: p[1],
      Payment_Date: p[2],
      Payment_Method: p[3],
      Payment_Status: p[4],
      Payment_Type: p[5],
      Transaction_Reference: p[6],
    });
  });

  return d;
}

const db = seedDatabase();
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

/**
 * Returns an array of all rows in the given table.
 */
export async function list<T = any>(table: TableName): Promise<T[]> {
  if (!db[table]) {
    throw new Error(`Unknown table: ${table}`);
  }

  // Retrieve actual hostel records from Flask + MySQL
  if (table === 'hostel') {
    const response = await apiClient.get<{
      status: string;
      count: number;
      data: T[];
    }>('/hostels/');

    return response.data.data;
  }

  // Other tables remain on sample data for now
  return clone(db[table] as unknown as T[]);
}

/**
 * Inserts a new row with a generated primary key into the table.
 */
export async function insert<T = any>(table: TableName, row: Partial<T>): Promise<T> {
  if (!db[table]) throw new Error(`Unknown table: ${table}`);
  const pk = PK[table];
  const tableRows = db[table] as any[];
  const id = tableRows.reduce((m, r) => Math.max(m, r[pk] || 0), 0) + 1;
  const rec = { ...row, [pk]: id };
  tableRows.push(rec);

  // Handle atomic allocation side-effect if applicable
  if (table === 'room_allocation' && (rec as any).Allocation_Status === 'Active' && (rec as any).Bed_ID) {
    const bed = db.bed.find(b => b.Bed_ID === (rec as any).Bed_ID);
    if (bed) bed.Bed_Status = 'Occupied';
  }

  return clone(rec as unknown as T);
}

/**
 * Updates an existing row identified by its ID.
 */
export async function update<T = any>(table: TableName, id: number, patch: Partial<T>): Promise<T> {
  if (!db[table]) throw new Error(`Unknown table: ${table}`);
  const pk = PK[table];
  const tableRows = db[table] as any[];
  const rec = tableRows.find(r => r[pk] === id);
  if (!rec) throw new Error(`Record ${id} not found in ${table}.`);
  Object.assign(rec, patch);

  // Handle allocation completion/cancellation freeing bed
  if (table === 'room_allocation' && ((patch as any).Allocation_Status === 'Completed' || (patch as any).Allocation_Status === 'Cancelled')) {
    const bed = db.bed.find(b => b.Bed_ID === rec.Bed_ID);
    if (bed) bed.Bed_Status = 'Available';
  } else if (table === 'room_allocation' && (patch as any).Allocation_Status === 'Active') {
    const bed = db.bed.find(b => b.Bed_ID === rec.Bed_ID);
    if (bed) bed.Bed_Status = 'Occupied';
  }

  return clone(rec as unknown as T);
}

/**
 * Deletes a row by ID, enforcing foreign key integrity.
 */
export async function remove(table: TableName, id: number): Promise<{ deleted: boolean }> {
  if (!db[table]) throw new Error(`Unknown table: ${table}`);
  for (const [child, col] of REFS[table] || []) {
    const childRows = (db as any)[child] as any[];
    const n = childRows.filter(r => r[col] === id).length;
    if (n) {
      throw new Error(`Cannot delete: ${n} record(s) in ${child.replace('_', ' ')} still depend on this one.`);
    }
  }
  const pk = PK[table];
  db[table] = (db[table] as any[]).filter(r => r[pk] !== id) as any;
  return { deleted: true };
}

export default {
  list,
  insert,
  update,
  remove,
  STATUS_LABEL,
  PK,
};
