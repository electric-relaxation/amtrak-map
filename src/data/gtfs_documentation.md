# Amtrak GTFS Data Documentation

## Overview
This document describes the Amtrak GTFS (General Transit Feed Specification) data, including file structures, relationships, and usage patterns for our sunlight visualization app.

**Data Source**
https://www.transit.land/feeds/f-9-amtrak~amtrakcalifornia~amtrakcharteredvehicle

**Feed Information:**
- Publisher: Amtrak
- Feed Version: 20260102
- Valid Period: 2026-01-03 to 2026-01-09
- Contact: DL_DTGTFSsupport@Amtrak.com

**Data Statistics:**
- 652 stops (stations)
- 62 routes (including Amtrak trains, thruway buses, and partner services)
- 2,025 trips
- 26,835 stop times
- 353,423 shape points

---

## File Descriptions

### 1. `agency.txt`
**Purpose:** Defines transit agencies operating the services.

**Fields:**
- `agency_id`: Unique identifier for the agency
- `agency_name`: Display name (e.g., "Amtrak", "Via Rail Canada", "Arrow Trailways")
- `agency_url`: Website URL
- `agency_timezone`: Timezone (all use America/New_York)
- `agency_lang`: Language code (all use "en")

**Key Agencies:**
- `51`: Amtrak (primary agency)
- `157`: Via Rail Canada (for Maple Leaf cross-border service)
- Various thruway bus operators (28, 43, 117, 147, etc.)

**Relationships:**
- Referenced by `routes.txt` via `agency_id`

**App Usage:**
- Filter to `agency_id = 51` to get only Amtrak train services
- Exclude thruway bus routes (route_type = 3)

---

### 2. `routes.txt`
**Purpose:** Defines transit routes (train lines).

**Fields:**
- `route_id`: Unique identifier for the route
- `agency_id`: Foreign key to `agency.txt`
- `route_short_name`: Short name (empty for Amtrak routes)
- `route_long_name`: Full name (e.g., "California Zephyr", "Northeast Regional")
- `route_type`: Service type (2 = rail, 3 = bus)
- `route_url`: Link to route information page
- `route_color`: Hex color (#CAE4F1 for all Amtrak)
- `route_text_color`: Text color (#000000 for all)

**Key Routes (route_type = 2, agency_id = 51):**
- 40751: Acela
- 88: Northeast Regional
- 96: California Zephyr
- 75: Empire Builder
- 36924: Coast Starlight
- 51: Southwest Chief
- 87: Texas Eagle
- 42991: Borealis (newly launched)
- 42994: Floridian
- 42996: Amtrak Mardi Gras Service
- And many more...

**Relationships:**
- Referenced by `trips.txt` via `route_id`

**App Usage:**
- Filter by `route_type = 2` and `agency_id = 51` for Amtrak trains only
- Use `route_long_name` for display names
- Map route_id to our custom route data

---

### 3. `calendar.txt`
**Purpose:** Defines service patterns (which days of the week services run).

**Fields:**
- `service_id`: Unique identifier for the service pattern
- `monday` through `sunday`: Binary (1 = runs, 0 = doesn't run)
- `start_date`: First day of service (YYYYMMDD)
- `end_date`: Last day of service (YYYYMMDD)

**Examples:**
- `312753626362`: Daily service (1,1,1,1,1,1,1) from 2025-12-28 to 2026-12-28
- `106260056362`: Weekday service (1,1,1,1,1,0,0) from 2026-01-05 to 2026-12-28
- `106460536362`: Sunday only (0,0,0,0,0,0,1) from 2026-02-22 to 2026-12-28

**Relationships:**
- Referenced by `trips.txt` via `service_id`

**App Usage:**
- Determine which days a specific trip operates
- Filter trips by date for schedule calculations
- Show users which services run on their selected date

---

### 4. `stops.txt`
**Purpose:** Defines station locations and details.

**Fields:**
- `stop_id`: 3-letter station code (e.g., "CHI", "NYP", "LAX")
- `stop_name`: Full station name
- `stop_url`: Link to station page on Amtrak.com
- `stop_timezone`: Station timezone
- `stop_lat`: Latitude (decimal degrees)
- `stop_lon`: Longitude (decimal degrees)

**Key Observations:**
- 652 total stops (includes thruway bus stops)
- Station codes match our manually created stations.ts codes
- Coordinates are precise (6-8 decimal places)
- Timezones vary by location (America/Chicago, America/New_York, America/Los_Angeles, America/Denver)

**Sample Stations:**
- CHI: Chicago Union Station (41.878684, -87.639443)
- NYP: New York Penn Station (42.352311, -71.055304) *Note: This appears to be Boston coordinates - possible data issue*
- LAX: Los Angeles (coordinates in file)
- BOS: Boston (42.352311, -71.055304)

**Relationships:**
- Referenced by `stop_times.txt` via `stop_id`

**App Usage:**
- **Primary source for station coordinates** - more authoritative than our manual data
- Plot stations on map
- Calculate distances between stations
- Determine timezone for sunlight calculations

---

### 5. `trips.txt`
**Purpose:** Defines individual trip instances (specific train departures).

**Fields:**
- `route_id`: Foreign key to `routes.txt`
- `service_id`: Foreign key to `calendar.txt`
- `trip_id`: Unique identifier for this trip instance
- `trip_short_name`: Train number (e.g., "301", "2222", "1340")
- `direction_id`: Direction (0 or 1, varies by route)
- `shape_id`: Foreign key to `shapes.txt` (defines geographic path)
- `trip_headsign`: Destination displayed to passengers

**Key Patterns:**
- Trip numbers are the actual train numbers passengers reference
- `direction_id`:
  - Not consistent across routes (0 could be northbound on one route, southbound on another)
  - Use `trip_headsign` for more reliable direction info
- `shape_id` defines the exact geographic path the train follows

**Examples:**
- Trip 228761: Capitol Corridor #536, direction 1, heading to Sacramento
- Trip 195509: Lincoln Service #301, direction 1, heading to St. Louis
- Trip 219069: Borealis #1333, direction 0, heading to St. Paul

**Relationships:**
- References `routes.txt` via `route_id`
- References `calendar.txt` via `service_id`
- References `shapes.txt` via `shape_id`
- Referenced by `stop_times.txt` via `trip_id`

**App Usage:**
- Get all trips for a route
- Find which geographic path (shape) a train follows
- Determine trip direction using `trip_headsign`
- Filter trips by service date using `service_id`

---

### 6. `stop_times.txt`
**Purpose:** Defines the schedule - which stops each trip makes and when.

**Fields:**
- `trip_id`: Foreign key to `trips.txt`
- `arrival_time`: Arrival time (HH:MM:SS, can exceed 24:00:00 for next-day arrivals)
- `departure_time`: Departure time (HH:MM:SS)
- `stop_id`: Foreign key to `stops.txt`
- `stop_sequence`: Order of stops (1 = first stop, 2 = second, etc.)
- `pickup_type`: Whether passengers can board (0 = regular pickup)
- `drop_off_type`: Whether passengers can alight (0 = regular drop-off)
- `timepoint`: Whether this is a scheduled timepoint (1 = yes)

**Key Patterns:**
- Times can exceed 24:00:00 (e.g., "25:09:00" means 1:09 AM the next day)
- `stop_sequence` always starts at 1 and increments
- All stops appear to be regular pickup/dropoff (0,0)
- All stops are timepoints (1)

**Example Schedule (Trip 182346):**
```
Stop #1: Chicago (CHI)     - Depart 20:10:00 (8:10 PM)
Stop #2: Summit (SMT)      - Arrive 20:32:00
Stop #3: Joliet (JOL)      - Arrive 21:00:00
Stop #4: Pontiac (PON)     - Arrive 21:38:00
Stop #5: Bloomington (BNL) - Arrive 22:16:00
...
Stop #9: St. Louis (STL)   - Arrive 25:09:00 (1:09 AM next day)
```

**Relationships:**
- References `trips.txt` via `trip_id`
- References `stops.txt` via `stop_id`

**App Usage:**
- **Critical for schedule visualization**
- Build ordered station list for each trip
- Calculate sunlight at each stop based on time
- Interpolate train position between stops
- Handle multi-day trips (times > 24:00:00)

---

### 7. `shapes.txt`
**Purpose:** Defines the exact geographic path trains follow between stations.

**Fields:**
- `shape_id`: Identifier for the shape (route path)
- `shape_pt_lat`: Latitude of this point
- `shape_pt_lon`: Longitude of this point
- `shape_pt_sequence`: Order of points along the path (1, 2, 3, ...)

**Key Characteristics:**
- 353,423 total shape points across all routes
- Very high resolution (points typically 0.0001-0.01 degrees apart)
- Follows actual rail lines, not straight lines between stations
- Each trip references one shape via `shape_id`

**Example (Shape ID 3, first 10 points):**
Shows a curving path with precise coordinates, likely following actual track geometry.

**Relationships:**
- Referenced by `trips.txt` via `shape_id`

**App Usage:**
- **Primary data source for drawing route paths on map**
- Render accurate rail lines (not station-to-station straight lines)
- Calculate sunlight along the actual path
- Animate train movement along realistic routes
- Higher fidelity than manually creating station-to-station connections

---

### 8. `feed_info.txt`
**Purpose:** Metadata about the GTFS feed itself.

**Fields:**
- `feed_publisher_name`: Amtrak
- `feed_publisher_url`: http://www.amtrak.com
- `feed_lang`: en (English)
- `feed_start_date`: 20260103
- `feed_end_date`: 20260109
- `feed_version`: 20260102

**App Usage:**
- Display data freshness to users
- Warn if data is outdated
- Automatic feed updates (fetch new GTFS periodically)

---

## Data Relationships

```
agency.txt (agency_id)
    ↓
routes.txt (route_id) ← calendar.txt (service_id)
    ↓                        ↓
trips.txt (trip_id, shape_id)
    ↓                        ↓
stop_times.txt          shapes.txt
    ↓
stops.txt (stop_id)
```

**Key Join Patterns:**

1. **Get all stops for a route:**
   ```
   routes → trips → stop_times → stops
   ```

2. **Get geographic path for a trip:**
   ```
   trips → shapes (join on shape_id, order by shape_pt_sequence)
   ```

3. **Get schedule for a specific date:**
   ```
   calendar (filter by date) → trips → stop_times → stops
   ```

4. **Get all trains serving a station:**
   ```
   stops → stop_times → trips → routes
   ```

---

## Amtrak-Specific Quirks & Patterns

### 1. **Mixed Service Types**
- GTFS includes both trains (route_type=2) and thruway buses (route_type=3)
- Filter to `route_type = 2` and `agency_id = 51` for Amtrak trains only

### 2. **Train Numbering**
- `trip_short_name` contains the actual train number passengers use
- Train numbers typically:
  - Even numbers: Eastbound/Southbound
  - Odd numbers: Westbound/Northbound
  - But always verify with `trip_headsign`

### 3. **Direction ID Inconsistency**
- `direction_id` is not standardized across routes
- Some routes use 0 for northbound, others use 1
- **Recommendation:** Use `trip_headsign` instead of `direction_id`

### 4. **Multi-Day Trips**
- Long-distance trains have times exceeding 24:00:00
- Example: Texas Eagle departs Chicago at 13:45:00, arrives San Antonio at 47:30:00 (next day 23:30)
- Must handle date arithmetic when times > 24:00:00

### 5. **Shape Precision**
- Shapes are very detailed (high point density)
- May want to downsample for performance while maintaining visual accuracy
- Each route may have multiple shape_ids (different trip variants)

### 6. **Station Code Consistency**
- GTFS `stop_id` codes match standard Amtrak 3-letter codes
- Directly compatible with our manually created stations.ts
- **Recommendation:** Replace our manual station data with GTFS stops.txt for coordinates

### 7. **Timezone Handling**
- Each station has its own timezone in stops.txt
- Times in stop_times.txt appear to be in local station time
- **Critical for sunlight calculations:** Use station timezone, not train's origin timezone

### 8. **Service Calendar Complexity**
- Many service_id patterns (259 total)
- Some trips only run on specific dates or have seasonal schedules
- Must check calendar.txt to determine if a trip operates on a given date

### 9. **Partner Services**
- Via Rail Canada (agency_id=157) for Maple Leaf beyond Buffalo
- Shore Line East (agency_id=1230) for commuter rail connections
- MARC (agency_id=1238) for commuter rail connections
- Filter these out unless showing connecting services

---

## Mapping GTFS to Our App's Needs

### 1. **Route Paths (Geometry)**
**Source:** `shapes.txt`

**How to use:**
```typescript
// For each route:
// 1. Get all trips for that route
SELECT trip_id, shape_id FROM trips WHERE route_id = [route_id]

// 2. Get unique shape_ids (a route may have multiple)
// 3. For each shape_id, get all points ordered by sequence
SELECT shape_pt_lat, shape_pt_lon
FROM shapes
WHERE shape_id = [shape_id]
ORDER BY shape_pt_sequence

// 4. Render as polyline on map
```

**Advantages over manual data:**
- Follows actual rail lines
- Includes curves, sidings, and track geometry
- Much higher accuracy

### 2. **Station Locations**
**Source:** `stops.txt`

**How to use:**
```typescript
// Get all train stations (exclude bus stops if needed)
SELECT stop_id, stop_name, stop_lat, stop_lon, stop_timezone
FROM stops
WHERE stop_id IN (
  SELECT DISTINCT stop_id FROM stop_times
  WHERE trip_id IN (
    SELECT trip_id FROM trips WHERE route_id IN (
      SELECT route_id FROM routes WHERE route_type = 2 AND agency_id = 51
    )
  )
)
```

**Advantages over manual data:**
- Official Amtrak coordinates
- Includes timezone information
- Already validated and in use

### 3. **Schedules**
**Source:** `stop_times.txt` + `trips.txt` + `calendar.txt`

**How to use:**
```typescript
// Get schedule for a specific trip on a specific date
// 1. Check if trip operates on that date
SELECT * FROM calendar
WHERE service_id = [trip.service_id]
AND start_date <= [date] AND end_date >= [date]
AND [day_of_week_column] = 1

// 2. Get ordered stop times
SELECT
  st.stop_id,
  st.arrival_time,
  st.departure_time,
  st.stop_sequence,
  s.stop_lat,
  s.stop_lon,
  s.stop_timezone
FROM stop_times st
JOIN stops s ON st.stop_id = s.stop_id
WHERE st.trip_id = [trip_id]
ORDER BY st.stop_sequence
```

**Sunlight calculation strategy:**
```typescript
// For each stop in schedule:
// 1. Parse arrival_time (handle times > 24:00:00)
// 2. Calculate absolute datetime using trip departure date + time offset
// 3. Convert to station's local timezone
// 4. Calculate sun position using suncalc library
// 5. Determine sunlight phase (day/night/dawn/dusk)

// For inter-station segments:
// 1. Get shape points between stops
// 2. Interpolate time along path
// 3. Calculate sunlight at regular intervals
// 4. Color code path segments by sunlight
```

### 4. **Route Direction**
**Source:** `trips.txt` (trip_headsign)

**How to use:**
```typescript
// Get both directions for a route
SELECT DISTINCT trip_headsign, direction_id
FROM trips
WHERE route_id = [route_id]

// Group trips by direction
// Use trip_headsign for display (e.g., "Chicago", "Seattle")
// Ignore direction_id as it's inconsistent
```

**Display strategy:**
```typescript
// Show dropdown or toggle:
// "Chicago → Seattle" (trip_headsign = "Seattle")
// "Seattle → Chicago" (trip_headsign = "Chicago")
```

---

## Implementation Recommendations

### Phase 1: Replace Manual Data
1. **Delete** `src/data/stations.ts` and `src/data/routes.ts`
2. **Create** GTFS parsing utilities:
   - `parseStops()` → read stops.txt
   - `parseRoutes()` → read routes.txt (filter to trains only)
   - `parseShapes()` → read shapes.txt
   - `parseTrips()` → read trips.txt
   - `parseStopTimes()` → read stop_times.txt
   - `parseCalendar()` → read calendar.txt

### Phase 2: Data Processing
1. **Filter** to Amtrak trains only (`route_type = 2`, `agency_id = 51`)
2. **Index** shapes by shape_id for fast lookup
3. **Build** route → trips → shape_id mapping
4. **Aggregate** station lists per route from stop_times

### Phase 3: Rendering
1. **Map Display:**
   - Render shapes as polylines (not station-to-station lines)
   - Plot stations from stops.txt coordinates
   - Support route selection from routes.txt

2. **Schedule Visualization:**
   - Allow date selection
   - Filter trips by calendar.txt
   - Display times from stop_times.txt

3. **Sunlight Calculation:**
   - Use stop_times + stops (with timezone) for calculations
   - Interpolate along shapes.txt paths
   - Color-code route segments by sunlight phase

### Phase 4: Optimization
1. **Shape Simplification:**
   - 353,423 points is a lot for web rendering
   - Use Douglas-Peucker algorithm to reduce points while preserving shape
   - Target: 100-500 points per route shape

2. **Data Caching:**
   - Parse GTFS once, cache in browser
   - Store processed data in IndexedDB
   - Only re-fetch when feed_version changes

3. **Lazy Loading:**
   - Load only shapes for visible routes
   - Load schedules on-demand when user selects a route

---

## File Size Considerations
- **shapes.txt**: 16.6 MB (353,423 lines) - **Largest file, may need optimization**
- **stop_times.txt**: 1.0 MB (26,836 lines)
- **trips.txt**: 90 KB (2,026 lines)
- **stops.txt**: 64 KB (653 lines)
- **routes.txt**: 6 KB (63 lines)
- **calendar.txt**: 12 KB (259 lines)
- **agency.txt**: 2 KB (21 lines)
- **feed_info.txt**: 0.3 KB (2 lines)

**Total**: ~17.7 MB uncompressed

**Recommendation:**
- Serve GTFS files as compressed .gz (likely 1-2 MB total)
- Pre-process and cache parsed data
- Consider shipping only Amtrak train subset (exclude thruway buses)

---

## Next Steps

1. **Validate data quality:**
   - Check for missing coordinates
   - Verify timezone consistency
   - Test date/time parsing logic

2. **Create TypeScript interfaces:**
   - Define types for each GTFS file
   - Build CSV parsing utilities
   - Type-safe data access

3. **Build route selector UI:**
   - Dropdown or list of routes from routes.txt
   - Show route names from `route_long_name`

4. **Implement sunlight engine:**
   - Time interpolation along routes
   - Suncalc integration with GTFS timezones
   - Segment coloring based on sun phase

5. **Compare with manual data:**
   - Verify station codes match
   - Check coordinate accuracy
   - Identify any missing stations or routes
