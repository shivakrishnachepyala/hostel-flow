import re
import json
import datetime
from db import get_db_connection


# ============================================================================
# 1. CANONICAL PREFERENCE NORMALIZATION & SCORING
# ============================================================================

def normalize_sleep(val):
    if not val or not isinstance(val, str):
        return "UNKNOWN"
    v = val.strip().lower()
    if any(k in v for k in ["night", "owl", "late"]):
        return "NIGHT_OWL"
    if any(k in v for k in ["early", "morning", "riser", "bird"]):
        return "EARLY_RISER"
    if any(k in v for k in ["flex", "moderate", "any", "adaptable"]):
        return "FLEXIBLE"
    return "UNKNOWN"


def normalize_study(val):
    if not val or not isinstance(val, str):
        return "UNKNOWN"
    v = val.strip().lower()
    if "library & room" in v or "mixed" in v:
        return "LIBRARY_AND_ROOM"
    if "room" in v or "in room" in v:
        return "ROOM_STUDY"
    if "library" in v:
        return "LIBRARY_STUDY"
    if "group" in v or "casual" in v:
        return "GROUP_STUDY"
    if "late" in v or "night" in v:
        return "NIGHT_STUDY"
    return "UNKNOWN"


def normalize_food(val):
    if not val or not isinstance(val, str):
        return "UNKNOWN"
    v = val.strip().lower()
    if "jain" in v:
        return "JAIN"
    if "vegan" in v:
        return "VEGAN"
    if "non" in v:
        return "NON_VEGETARIAN"
    if "egg" in v:
        return "EGGETARIAN"
    if "veg" in v:
        return "VEGETARIAN"
    return "UNKNOWN"


def parse_languages(val):
    if not val or not isinstance(val, str):
        return set()
    cleaned = re.split(r"[,/;&|]+", val.lower())
    return {c.strip() for c in cleaned if c.strip()}


def score_sleep_schedule(val1, val2):
    s1, s2 = normalize_sleep(val1), normalize_sleep(val2)
    if s1 == "UNKNOWN" or s2 == "UNKNOWN":
        return 0.0, "Missing sleep schedule preference"

    if s1 == s2 and s1 != "FLEXIBLE":
        label = "Both Early Risers (+30.0%)" if s1 == "EARLY_RISER" else "Both Night Owls (+30.0%)"
        return 30.0, label
    if s1 == "FLEXIBLE" and s2 == "FLEXIBLE":
        return 27.0, "Both have flexible sleep schedules (+27.0%)"
    if s1 == "FLEXIBLE" or s2 == "FLEXIBLE":
        fixed = s2 if s1 == "FLEXIBLE" else s1
        fixed_label = "Night Owl" if fixed == "NIGHT_OWL" else "Early Riser"
        return 22.5, f"Flexible schedule adapts well with {fixed_label} (+22.5%)"
    # Direct conflict (Early riser vs Night owl)
    return 5.0, "Opposite sleep schedules: Early Riser vs Night Owl (+5.0%)"


def score_study_habits(val1, val2):
    s1, s2 = normalize_study(val1), normalize_study(val2)
    if s1 == "UNKNOWN" or s2 == "UNKNOWN":
        return 0.0, "Missing study habits preference"

    if s1 == s2:
        return 25.0, f"Identical study style: {val1} (+25.0%)"
    if {s1, s2} == {"ROOM_STUDY", "LIBRARY_AND_ROOM"}:
        return 20.0, "Compatible study preferences: Room and Library (+20.0%)"
    if {s1, s2} == {"LIBRARY_STUDY", "LIBRARY_AND_ROOM"}:
        return 20.0, "Compatible study preferences: Library focus (+20.0%)"
    if s1 == "GROUP_STUDY" or s2 == "GROUP_STUDY":
        return 8.0, "Potential study sound divergence: Group study (+8.0%)"
    return 15.0, f"Differing study routines: {val1} vs {val2} (+15.0%)"


def score_food_preference(val1, val2):
    f1, f2 = normalize_food(val1), normalize_food(val2)
    if f1 == "UNKNOWN" or f2 == "UNKNOWN":
        return 0.0, "Missing food preference"

    if f1 == f2:
        return 25.0, f"Identical food preference: {val1} (+25.0%)"
    if {f1, f2} <= {"VEGETARIAN", "JAIN", "VEGAN"}:
        return 21.0, f"Compatible plant-based dietary preferences: {val1} & {val2} (+21.0%)"
    if {f1, f2} == {"NON_VEGETARIAN", "EGGETARIAN"}:
        return 20.0, f"Compatible non-vegetarian dining preferences (+20.0%)"
    # Non-veg vs Veg
    return 10.0, f"Mixed dietary preferences: {val1} vs {val2} (+10.0%)"


def score_language_overlap(val1, val2):
    langs1, langs2 = parse_languages(val1), parse_languages(val2)
    if not langs1 or not langs2:
        return 0.0, "Missing language preference"

    common = langs1 & langs2
    if not common:
        return 0.0, "No common spoken languages reported (0.0%)"

    common_names = ", ".join(c.capitalize() for c in sorted(common))
    if len(common) >= 2:
        return 20.0, f"Multiple shared languages: {common_names} (+20.0%)"
    return 16.0, f"Shared communication language: {common_names} (+16.0%)"


def calculate_compatibility(student_a, student_b):
    """
    Computes a deterministic, weighted compatibility score (0 to 100)
    between two students based on their real preference attributes.
    Returns (score, breakdown_dict).
    """
    sleep_score, sleep_reason = score_sleep_schedule(student_a.get("Sleep_Schedule"), student_b.get("Sleep_Schedule"))
    study_score, study_reason = score_study_habits(student_a.get("Study_Habits"), student_b.get("Study_Habits"))
    food_score, food_reason = score_food_preference(student_a.get("Food_Preference"), student_b.get("Food_Preference"))
    lang_score, lang_reason = score_language_overlap(student_a.get("Language"), student_b.get("Language"))

    total_score = round(sleep_score + study_score + food_score + lang_score, 1)

    # Department bonus or diversity note
    dept_a = student_a.get("Department") or ""
    dept_b = student_b.get("Department") or ""
    dept_same = bool(dept_a and dept_b and dept_a.lower() == dept_b.lower())

    # Build human-readable explanation
    highlights = []
    if sleep_score >= 20.0:
        highlights.append("compatible sleep cycles")
    if study_score >= 18.0:
        highlights.append("aligned study habits")
    if food_score >= 20.0:
        highlights.append("harmonious dietary preferences")
    if lang_score >= 15.0:
        highlights.append("common language of communication")

    if highlights:
        summary = f"Strong alignment in {', '.join(highlights)}."
    else:
        summary = "Moderate compatibility with differing daily routines."

    if dept_same:
        summary += f" Both study in {dept_a}."

    breakdown = {
        "total_score": total_score,
        "sleep": {"score": sleep_score, "weight": 30.0, "detail": sleep_reason},
        "study": {"score": study_score, "weight": 25.0, "detail": study_reason},
        "food": {"score": food_score, "weight": 25.0, "detail": food_reason},
        "language": {"score": lang_score, "weight": 20.0, "detail": lang_reason},
        "summary": summary,
        "gender": student_a.get("Gender"),
        "same_department": dept_same,
    }

    return total_score, breakdown


# ============================================================================
# 2. GLOBAL MAXIMUM WEIGHT MATCHING OPTIMIZATION
# ============================================================================

def optimize_pairs_max_weight(student_ids, pair_scores):
    """
    Solves the Maximum Weight Matching problem for an arbitrary graph of student candidates.
    student_ids: list of student IDs
    pair_scores: dict mapping (min(id1, id2), max(id1, id2)) -> float score

    Returns optimal list of pairs: [(id1, id2, score), ...] maximizing total sum of compatibility.
    """
    n = len(student_ids)
    if n < 2:
        return []

    # Map student_id to 0..n-1 index
    id_to_idx = {sid: i for i, sid in enumerate(student_ids)}
    idx_to_id = {i: sid for i, sid in enumerate(student_ids)}

    # Build adjacency list with scores
    adj = {i: [] for i in range(n)}
    for (u_id, v_id), score in pair_scores.items():
        if u_id in id_to_idx and v_id in id_to_idx:
            u, v = id_to_idx[u_id], id_to_idx[v_id]
            adj[u].append((v, score))
            adj[v].append((u, score))

    # Sort neighbor lists by score descending
    for i in range(n):
        adj[i].sort(key=lambda x: x[1], reverse=True)

    memo = {}

    def solve(mask):
        if mask in memo:
            return memo[mask]

        # Find first unmatched student
        first_unmatched = -1
        for i in range(n):
            if not (mask & (1 << i)):
                first_unmatched = i
                break

        if first_unmatched == -1:
            return 0.0, []

        u = first_unmatched
        # Option 1: Leave u unmatched
        best_score, best_pairs = solve(mask | (1 << u))

        # Option 2: Pair u with each eligible candidate v
        for v, w in adj[u]:
            if not (mask & (1 << v)):
                next_mask = mask | (1 << u) | (1 << v)
                sub_score, sub_pairs = solve(next_mask)
                total_w = sub_score + w
                if total_w > best_score:
                    best_score = total_w
                    best_pairs = [(idx_to_id[u], idx_to_id[v], w)] + sub_pairs

        memo[mask] = (best_score, best_pairs)
        return memo[mask]

    _, matched_pairs = solve(0)
    return matched_pairs


# ============================================================================
# 3. END-TO-END AUTOMATIC MATCHING ENGINE
# ============================================================================

def run_roommate_matching_engine():
    """
    Executes the full automated roommate matching process:
    1. Identifies unallocated, eligible students with recorded preferences.
    2. Groups candidates by gender.
    3. Respects existing approved/accepted matches.
    4. Computes deterministic compatibility scores for all candidate pairs.
    5. Runs global maximum-weight matching optimization.
    6. Persists generated pairings into MySQL `roommate_match` table with 'Proposed' status.
    7. Returns comprehensive execution metrics and pairing details.
    """
    connection = None
    cursor = None
    try:
        connection = get_db_connection()
        cursor = connection.cursor(dictionary=True)

        # 1. Fetch existing approved or accepted matches to strictly protect them
        cursor.execute("""
            SELECT Student_ID_1, Student_ID_2, Match_Status
            FROM roommate_match
            WHERE Match_Status IN ('Approved', 'Accepted')
        """)
        protected_matches = cursor.fetchall()
        protected_student_ids = set()
        for m in protected_matches:
            protected_student_ids.add(m["Student_ID_1"])
            protected_student_ids.add(m["Student_ID_2"])

        # 2. Query eligible students:
        #    - Has preferences recorded in student_preferences
        #    - Not actively allocated to a room/bed
        #    - Not part of an existing Approved match
        cursor.execute("""
            SELECT
                s.Student_ID, s.Name, s.Gender, s.Department, s.Year_of_Study,
                p.Language, p.Food_Preference, p.Sleep_Schedule, p.Study_Habits
            FROM student s
            INNER JOIN student_preferences p ON s.Student_ID = p.Student_ID
            WHERE s.Student_ID NOT IN (
                SELECT Student_ID FROM room_allocation WHERE Allocation_Status = 'Active'
            )
        """)
        all_candidate_rows = cursor.fetchall()

        # Filter out protected students
        eligible_students = [
            s for s in all_candidate_rows
            if s["Student_ID"] not in protected_student_ids
        ]

        # Group by gender
        gender_groups = {}
        for s in eligible_students:
            g = (s.get("Gender") or "Unknown").strip().capitalize()
            if g not in gender_groups:
                gender_groups[g] = []
            gender_groups[g].append(s)

        generated_pairs = []
        unmatched_students = []
        total_pairs_considered = 0

        # Process each gender cohort independently
        for gender, cohort in gender_groups.items():
            if gender == "Unknown":
                # Exclude students with unverified gender
                unmatched_students.extend(cohort)
                continue

            if len(cohort) < 2:
                unmatched_students.extend(cohort)
                continue

            cohort_ids = [s["Student_ID"] for s in cohort]
            student_lookup = {s["Student_ID"]: s for s in cohort}

            # Precalculate compatibility scores
            pair_scores = {}
            pair_explanations = {}

            for i in range(len(cohort)):
                for j in range(i + 1, len(cohort)):
                    s1 = cohort[i]
                    s2 = cohort[j]
                    u = min(s1["Student_ID"], s2["Student_ID"])
                    v = max(s1["Student_ID"], s2["Student_ID"])

                    score, explanation = calculate_compatibility(s1, s2)
                    pair_scores[(u, v)] = score
                    pair_explanations[(u, v)] = explanation
                    total_pairs_considered += 1

            # Optimize globally
            optimal_cohort_pairs = optimize_pairs_max_weight(cohort_ids, pair_scores)

            matched_in_cohort = set()
            for u, v, w in optimal_cohort_pairs:
                matched_in_cohort.add(u)
                matched_in_cohort.add(v)
                generated_pairs.append({
                    "Student_ID_1": u,
                    "Student_ID_2": v,
                    "Student_1_Name": student_lookup[u]["Name"],
                    "Student_2_Name": student_lookup[v]["Name"],
                    "Gender": gender,
                    "Compatibility_Score": w,
                    "Explanation": pair_explanations.get((u, v), {}),
                })

            for s in cohort:
                if s["Student_ID"] not in matched_in_cohort:
                    unmatched_students.append(s)

        # 3. Persist generated pairs into MySQL
        # Remove any existing unapproved 'Proposed' or 'Pending' matches for these students
        # while strictly preserving 'Approved' and 'Accepted' matches
        today_str = datetime.date.today().strftime("%Y-%m-%d")
        persisted_records = []

        for pair in generated_pairs:
            u = pair["Student_ID_1"]
            v = pair["Student_ID_2"]
            score = pair["Compatibility_Score"]
            exp_json = json.dumps(pair["Explanation"])

            # Clean any old proposed record for these students
            cursor.execute("""
                DELETE FROM roommate_match
                WHERE Match_Status NOT IN ('Approved', 'Accepted')
                  AND (Student_ID_1 IN (%s, %s) OR Student_ID_2 IN (%s, %s))
            """, (u, v, u, v))

            # Insert new proposed match
            cursor.execute("""
                INSERT INTO roommate_match (
                    Student_ID_1, Student_ID_2, Compatibility_Score,
                    Match_Date, Match_Status, Match_Explanation
                ) VALUES (%s, %s, %s, %s, 'Proposed', %s)
                ON DUPLICATE KEY UPDATE
                    Compatibility_Score = VALUES(Compatibility_Score),
                    Match_Date = VALUES(Match_Date),
                    Match_Status = 'Proposed',
                    Match_Explanation = VALUES(Match_Explanation)
            """, (u, v, score, today_str, exp_json))

            match_id = cursor.lastrowid
            pair["Match_ID"] = match_id
            pair["Match_Date"] = today_str
            pair["Match_Status"] = "Proposed"
            persisted_records.append(pair)

        connection.commit()

        avg_score = (
            round(sum(p["Compatibility_Score"] for p in generated_pairs) / len(generated_pairs), 1)
            if generated_pairs else 0.0
        )

        return {
            "status": "success",
            "message": f"Successfully generated {len(generated_pairs)} optimized roommate pair(s).",
            "metrics": {
                "total_eligible_students": len(eligible_students),
                "pairs_generated": len(generated_pairs),
                "unmatched_count": len(unmatched_students),
                "average_compatibility": avg_score,
                "candidate_combinations_evaluated": total_pairs_considered,
                "preserved_approved_matches": len(protected_matches),
            },
            "unmatched_students": [
                {
                    "Student_ID": s["Student_ID"],
                    "Name": s["Name"],
                    "Gender": s["Gender"],
                    "Department": s["Department"],
                }
                for s in unmatched_students
            ],
            "matches": persisted_records,
        }

    except Exception as err:
        if connection and connection.is_connected():
            connection.rollback()
        raise err
    finally:
        if cursor:
            cursor.close()
        if connection and connection.is_connected():
            connection.close()
