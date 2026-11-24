import urllib.request
import json

base = 'http://localhost:5000'

expected = {
    1: {'name': 'Block C1', 'hostel': 'Hostel C', 'rooms': 1, 'beds': 2, 'occupied': 0, 'avail': 2},
    201: {'name': 'Block A1', 'hostel': 'Hostel A', 'rooms': 5, 'beds': 12, 'occupied': 4, 'avail': 8},
    202: {'name': 'Block A2', 'hostel': 'Hostel A', 'rooms': 30, 'beds': 60, 'occupied': 0, 'avail': 60},
    203: {'name': 'Block B1', 'hostel': 'Hostel B', 'rooms': 2, 'beds': 4, 'occupied': 2, 'avail': 2},
    204: {'name': 'Block D1', 'hostel': 'Hostel D', 'rooms': 30, 'beds': 75, 'occupied': 0, 'avail': 75},
    205: {'name': 'Block D2', 'hostel': 'Hostel D', 'rooms': 30, 'beds': 75, 'occupied': 0, 'avail': 75},
}

total_rooms = 0
total_beds = 0
total_occupied = 0
total_avail = 0
all_pii_clean = True

print('=== VERIFYING LIVE HTTP API FOR ALL 6 BLOCKS ===')
for b_id, exp in expected.items():
    url = f'{base}/api/explorer/block/{b_id}'
    req = urllib.request.Request(url)
    with urllib.request.urlopen(req) as resp:
        res = json.loads(resp.read().decode())
        assert res['status'] == 'success'
        d = res['data']
        h = d['hostel']
        b = d['block']
        s = d['stats']
        rms = d['rooms']
        
        # Verify counts match expected
        assert s['total_rooms'] == exp['rooms'], f'Block {b_id} rooms mismatch: {s["total_rooms"]} vs {exp["rooms"]}'
        assert s['total_beds'] == exp['beds'], f'Block {b_id} beds mismatch: {s["total_beds"]} vs {exp["beds"]}'
        assert s['occupied_beds'] == exp['occupied'], f'Block {b_id} occupied mismatch: {s["occupied_beds"]} vs {exp["occupied"]}'
        assert s['available_beds'] == exp['avail'], f'Block {b_id} avail mismatch: {s["available_beds"]} vs {exp["avail"]}'
        
        # Verify zero PII
        for r in rms:
            for bd in r['beds']:
                for k in bd.keys():
                    if 'student' in k.lower() or 'name' in k.lower() or 'email' in k.lower() or 'phone' in k.lower():
                        all_pii_clean = False
        
        total_rooms += s['total_rooms']
        total_beds += s['total_beds']
        total_occupied += s['occupied_beds']
        total_avail += s['available_beds']
        
        b_name = b['Block_Name']
        h_name = h['Hostel_Name']
        tr = s['total_rooms']
        tb = s['total_beds']
        ob = s['occupied_beds']
        ab = s['available_beds']
        rate = s['occupancy_rate']
        fls = d['floors']
        print(f'PASS Block {b_id} ({b_name}, {h_name}): Rooms={tr}, Beds={tb}, Occ={ob}, Avail={ab}, Rate={rate}%, Floors={fls}')

print(f'\n=== CUMULATIVE INVENTORY TOTALS ===')
print(f'Total Rooms: {total_rooms} (Expected: 98)')
print(f'Total Beds: {total_beds} (Expected: 228)')
print(f'Total Occupied Beds: {total_occupied} (Expected: 6)')
print(f'Total Available Beds: {total_avail} (Expected: 222)')
print(f'Zero PII Exposed: {all_pii_clean}')

assert total_rooms == 98
assert total_beds == 228
assert total_occupied == 6
assert total_avail == 222
assert all_pii_clean is True

print('\n=== VERIFYING LIVE /api/explorer/campus ENDPOINT ===')
req_campus = urllib.request.Request(f'{base}/api/explorer/campus')
with urllib.request.urlopen(req_campus) as resp:
    res = json.loads(resp.read().decode())
    assert res['status'] == 'success'
    c_data = res['data']
    c_stats = c_data['campus_stats']
    c_hostels = c_data['hostels']
    
    print(f'Campus Stats: {c_stats}')
    assert c_stats['total_hostels'] == 4
    assert c_stats['total_blocks'] == 6
    assert c_stats['total_rooms'] == 98
    assert c_stats['total_beds'] == 228
    assert c_stats['occupied_beds'] == 6
    assert c_stats['available_beds'] == 222
    assert c_stats['occupancy_rate'] == 2.6
    
    # Check each hostel (Alphabetical IDs: 1=A, 2=B, 3=C, 4=D)
    hostel_map = {h['Hostel_ID']: h for h in c_hostels}
    assert 1 in hostel_map, 'Hostel A missing'
    assert 2 in hostel_map, 'Hostel B missing'
    assert 3 in hostel_map, 'Hostel C missing'
    assert 4 in hostel_map, 'Hostel D missing'
    
    # Hostel A (ID 1, Boys): 2 blocks, 35 rooms, 72 beds, 4 occ
    ha = hostel_map[1]
    assert ha['Hostel_Name'] == 'Hostel A'
    assert ha['Hostel_Type'] == 'Boys'
    assert ha['total_blocks'] == 2
    assert ha['total_rooms'] == 35
    assert ha['total_beds'] == 72
    assert ha['occupied_beds'] == 4
    assert ha['available_beds'] == 68
    assert ha['floor_count'] == 3
    print('PASS Campus Hostel A (Boys): 2 Blocks, 35 Rooms, 72 Beds, 4 Occ, 68 Avail')

    # Hostel B (ID 2, Girls): 1 block, 2 rooms, 4 beds, 2 occ
    hb = hostel_map[2]
    assert hb['Hostel_Name'] == 'Hostel B'
    assert hb['Hostel_Type'] == 'Girls'
    assert hb['total_blocks'] == 1
    assert hb['total_rooms'] == 2
    assert hb['total_beds'] == 4
    assert hb['occupied_beds'] == 2
    assert hb['available_beds'] == 2
    assert hb['floor_count'] == 1
    print('PASS Campus Hostel B (Girls): 1 Block, 2 Rooms, 4 Beds, 2 Occ, 2 Avail')

    # Hostel C (ID 3, Girls): 1 block, 1 room, 2 beds, 0 occ
    hc = hostel_map[3]
    assert hc['Hostel_Name'] == 'Hostel C'
    assert hc['Hostel_Type'] == 'Girls'
    assert hc['total_blocks'] == 1
    assert hc['total_rooms'] == 1
    assert hc['total_beds'] == 2
    assert hc['occupied_beds'] == 0
    assert hc['available_beds'] == 2
    assert hc['floor_count'] == 1
    print('PASS Campus Hostel C (Girls): 1 Block, 1 Room, 2 Beds, 0 Occ, 2 Avail')

    # Hostel D (ID 4, Boys): 2 blocks, 60 rooms, 150 beds, 0 occ
    hd = hostel_map[4]
    assert hd['Hostel_Name'] == 'Hostel D'
    assert hd['Hostel_Type'] == 'Boys'
    assert hd['total_blocks'] == 2
    assert hd['total_rooms'] == 60
    assert hd['total_beds'] == 150
    assert hd['occupied_beds'] == 0
    assert hd['available_beds'] == 150
    assert hd['floor_count'] == 3
    print('PASS Campus Hostel D (Boys): 2 Blocks, 60 Rooms, 150 Beds, 0 Occ, 150 Avail')

print('\nALL LIVE REGRESSION ASSERTIONS PASSED WITH 100% ACCURACY!')
