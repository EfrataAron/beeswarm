# Notification Details Implementation

## Overview
This document describes the implementation of the notification details feature in the Beeswarm mobile app.

## Features Implemented

### 1. **Automatic Alert Acknowledgment**
When a user clicks on a notification (alert) to view its details:
- The alert status in the database changes from `pending` to `acknowledged`
- The `acknowledged_by` field is set to the current user ID
- The `acknowledged_at` timestamp is recorded
- The UI updates to show the alert as "Acknowledged"

**Files Modified:**
- `src/api/services/alert.service.ts` - Updated `fetchAlertDetail()` to handle acknowledgment
- `src/screens/alerts/details/AlertDetailsScreen.tsx` - Calls `acknowledgeAlert()` when viewing details

### 2. **Enhanced Notification Details Page**
The alert details screen now displays:

#### Core Information:
- **Hive Name** - Shows the name of the hive associated with the alert
- **Severity** - Visual pill showing Critical/Warning/Info with color coding
- **Time Created** - Formatted timestamp of when the alert was created
- **Alert Status** - Shows "Pending" or "Acknowledged"
- **Full Details** - Complete description of the alert

#### Advisory Section:
- **Advisory Type** - "Preventive" or "Reactive"
- **Summary** - Overview of recommended actions
- **Action Items** - List of specific actions with priority indicators:
  - High priority (Red dot)
  - Medium priority (Orange dot)
  - Low priority (Green dot)

#### Audio Playback Section:
- **Play/Pause Button** - Control audio playback
- **Stop Button** - Stop and reset audio
- **Duration Display** - Shows recording length
- **Timestamp** - When the recording was captured
- **Loading State** - Shows spinner while audio loads

**Files Modified:**
- `src/screens/alerts/details/AlertDetailsScreen.tsx` - Main screen component
- `src/screens/alerts/details/AlertDetailsScreen.styles.ts` - Added audio player styles
- `src/api/types.ts` - Added `AudioRecording` type and updated `AlertDetailData`

### 3. **Navigation from Hive Details**
Users can now click on notifications in the Hive Details screen:
- Tapping an alert navigates to the Alerts tab
- Automatically opens the AlertDetails screen for that specific alert
- Cross-tab navigation works seamlessly

**Files Modified:**
- `src/screens/hives/details/HiveDetailsScreen.tsx` - Added navigation to AlertDetails

## Data Flow

```
User clicks alert in HiveDetails
    ↓
Navigate to Alerts tab → AlertDetails screen
    ↓
fetchAlertDetail(alertId) - loads alert data from API
    ↓
acknowledgeAlert(alertId) - updates status to 'acknowledged'
    ↓
Display alert details with:
    - Hive info
    - Severity
    - Timestamp
    - Advisory actions
    - Audio player (if recording exists)
```

## API Endpoints Expected

Your FastAPI backend should implement these endpoints:

### 1. Get Alert Details
```
GET /alerts/{alertId}

Response:
{
  "id": "string",
  "hive_id": "string",
  "hive_name": "string",
  "severity": "Critical" | "Warning" | "Info",
  "title": "string",
  "time": "string",
  "created_at": "ISO timestamp",
  "details": "string",
  "acknowledged": boolean,
  "action_status": "pending" | "acknowledged",
  "audio_recording": {
    "id": "string",
    "file_path": "URL to audio file",
    "duration_seconds": number,
    "recorded_at": "ISO timestamp"
  } | null,
  "advisory": {
    "id": "string",
    "alert_id": "string",
    "type": "Preventive" | "Reactive",
    "summary": "string",
    "actions": [
      {
        "id": "string",
        "description": "string",
        "priority": "High" | "Medium" | "Low"
      }
    ]
  } | null
}
```

### 2. Acknowledge Alert
```
POST /alerts/{alertId}/acknowledge

Response:
{
  "success": true,
  "message": "Alert acknowledged successfully"
}
```

### 3. Get Advisory (Optional - if not included in alert details)
```
GET /alerts/{alertId}/advisory

Response:
{
  "id": "string",
  "alert_id": "string",
  "type": "Preventive" | "Reactive",
  "summary": "string",
  "actions": [...]
}
```

## Database Schema

The alerts table should have these fields:
- `id` - Primary key
- `hive_id` - Foreign key to beehives table
- `severity` or `level` - Alert severity
- `title` or `recommended_action` - Alert title
- `message` or `details` - Full description
- `action_status` or `status` - 'pending' | 'acknowledged'
- `acknowledged_by` - Foreign key to beekeepers table
- `acknowledged_at` - Timestamp
- `created_at` - Timestamp
- `inference_id` - Link to inference/prediction (optional)

## Audio File Handling

The audio files should be:
1. **Stored** in a publicly accessible location (S3, cloud storage, or server)
2. **URL** provided in the `file_path` field
3. **Accessible** via HTTP/HTTPS (for expo-av to stream)
4. **Format** should be MP3, WAV, or other common audio formats

Example file paths:
- `https://your-api.com/storage/audio/recordings/hive123_2026-06-08.mp3`
- `https://s3.amazonaws.com/beeswarm/audio/abc123.wav`

## Dependencies Installed

- `expo-av` - For audio playback functionality

## Testing Checklist

- [ ] Click notification in Hive Details navigates to Alert Details
- [ ] Alert status changes from pending to acknowledged on view
- [ ] Hive name displays correctly
- [ ] Severity shows with correct color (Critical=Red, Warning=Orange, Info=Blue)
- [ ] Advisory section appears for unacknowledged alerts
- [ ] Audio player appears when recording exists
- [ ] Play/Pause button works correctly
- [ ] Stop button resets playback
- [ ] Audio plays the actual recording file
- [ ] Error handling works when audio file is unavailable
- [ ] Acknowledged alerts show "Acknowledged" status
- [ ] Navigation back to Hive Details works correctly

## Error Handling

The implementation includes error handling for:
- Failed API calls (retries available)
- Missing audio files (shows error alert)
- Network timeouts
- Invalid data responses
- Missing advisory data (gracefully hidden)

## Future Enhancements

Possible improvements:
1. **Audio seek bar** - Allow scrubbing through the audio
2. **Download audio** - Save recording locally
3. **Playback speed** - Adjust playback rate
4. **Waveform visualization** - Show audio waveform
5. **Action checklist** - Mark advisory actions as complete
6. **Notification history** - View past acknowledged alerts
7. **Batch acknowledgment** - Acknowledge multiple alerts at once

## Notes

- The PHP backend code was removed as the project uses FastAPI
- Audio playback requires `expo-av` package (already installed)
- Cross-tab navigation uses React Navigation's nested navigator pattern
- Alert acknowledgment happens automatically on view (not on dismiss)
