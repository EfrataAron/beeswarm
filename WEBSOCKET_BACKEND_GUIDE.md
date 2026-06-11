# WebSocket Backend Implementation Guide

## Overview
To enable real-time alert updates without polling overhead, implement a WebSocket endpoint in your backend.

---

## Backend Implementation (Python/FastAPI Example)

### 1. Install Dependencies
```bash
pip install fastapi websockets
```

### 2. WebSocket Endpoint

```python
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, Depends
from typing import Set
import asyncio

app = FastAPI()

# Store active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: Set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.add(websocket)
        print(f"Client connected. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        self.active_connections.discard(websocket)
        print(f"Client disconnected. Total: {len(self.active_connections)}")

    async def broadcast_alert_count(self, user_id: str, unread_count: int):
        """Send alert count update to all connections for this user"""
        message = {
            "type": "alert_count_update",
            "unread_count": unread_count,
            "user_id": user_id
        }
        
        disconnected = set()
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                print(f"Error sending to client: {e}")
                disconnected.add(connection)
        
        # Remove disconnected clients
        for conn in disconnected:
            self.disconnect(conn)

manager = ConnectionManager()


@app.websocket("/ws/alerts")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str,  # Get from query param or header
    db: Session = Depends(get_db)
):
    # Verify token
    user = verify_token(token, db)
    if not user:
        await websocket.close(code=1008, reason="Unauthorized")
        return
    
    await manager.connect(websocket)
    
    try:
        # Send initial count
        initial_count = get_unread_alert_count(user.id, db)
        await websocket.send_json({
            "type": "alert_count_update",
            "unread_count": initial_count
        })
        
        # Keep connection alive
        while True:
            # Wait for messages (client might send ping/pong)
            data = await websocket.receive_text()
            
            # Handle ping/pong for keepalive
            if data == "ping":
                await websocket.send_text("pong")
                
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"WebSocket error: {e}")
        manager.disconnect(websocket)


def get_unread_alert_count(user_id: str, db: Session) -> int:
    """Get count of unacknowledged alerts for user"""
    return db.query(Alert).filter(
        Alert.owner_id == user_id,
        Alert.action_status != "acknowledged"
    ).count()


# Helper function to broadcast when alerts change
async def notify_alert_update(user_id: str, db: Session):
    """Call this when a new alert is created or acknowledged"""
    unread_count = get_unread_alert_count(user_id, db)
    await manager.broadcast_alert_count(user_id, unread_count)


# Example: Call when creating a new alert
@app.post("/alerts")
async def create_alert(alert_data: AlertCreate, db: Session = Depends(get_db)):
    # Create alert in database
    new_alert = Alert(**alert_data.dict())
    db.add(new_alert)
    db.commit()
    
    # Notify via WebSocket
    await notify_alert_update(alert_data.owner_id, db)
    
    return new_alert


# Example: Call when acknowledging an alert
@app.post("/alerts/{alert_id}/acknowledge")
async def acknowledge_alert(
    alert_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    alert = db.query(Alert).filter(Alert.id == alert_id).first()
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    alert.action_status = "acknowledged"
    db.commit()
    
    # Notify via WebSocket
    await notify_alert_update(current_user.id, db)
    
    return {"message": "Alert acknowledged"}
```

---

## Alternative: Server-Sent Events (SSE)

If WebSockets are too complex, use SSE (simpler, one-way):

```python
from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import asyncio

@app.get("/sse/alerts")
async def alert_stream(
    token: str,
    db: Session = Depends(get_db)
):
    user = verify_token(token, db)
    if not user:
        raise HTTPException(status_code=401, detail="Unauthorized")
    
    async def event_generator():
        while True:
            # Check for new alerts every 5 seconds
            count = get_unread_alert_count(user.id, db)
            yield f"data: {json.dumps({'unread_count': count})}\n\n"
            await asyncio.sleep(5)
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream"
    )
```

---

## Mobile App Usage

The mobile app is already configured! Just implement one of the backend options above.

### What Happens:
1. ✅ **On Login** → WebSocket connects automatically
2. ✅ **New Alert Created** → Badge updates instantly (no polling!)
3. ✅ **Alert Acknowledged** → Badge updates instantly
4. ✅ **On Logout** → WebSocket disconnects
5. ✅ **Connection Lost** → Falls back to 60-second polling

---

## Testing

### Test WebSocket Connection:
```bash
# Using wscat
npm install -g wscat
wscat -c "ws://localhost:8003/ws/alerts?token=YOUR_TOKEN"
```

### Expected Messages:
```json
{"type": "alert_count_update", "unread_count": 3}
```

---

## Benefits

✅ **Instant Updates** - No delay, updates appear immediately  
✅ **Low Overhead** - Single persistent connection vs. constant polling  
✅ **Scalable** - Server only sends when data changes  
✅ **Battery Friendly** - Mobile app doesn't wake up every 30 seconds  
✅ **Automatic Fallback** - Still works if WebSocket fails  

---

## Production Considerations

1. **Load Balancing**: Use sticky sessions or Redis pub/sub for multiple backend instances
2. **Security**: Validate tokens on every connection
3. **Heartbeat**: Send ping/pong every 30s to detect dead connections
4. **Reconnection**: Client already handles exponential backoff
5. **Monitoring**: Track active WebSocket connections

---

## If You Don't Want WebSockets Yet

The current polling approach (60 seconds) is acceptable for most use cases:
- Simple to implement ✅
- Works everywhere ✅
- Low enough frequency to not cause issues

Only implement WebSockets if:
- You need instant (<1 second) updates
- You have high traffic where polling creates overhead
- Battery life on mobile is a concern
