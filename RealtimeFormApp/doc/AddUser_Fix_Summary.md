# AddUser Page Issues and Fixes

## Problems Identified

### 1. **Properties Getting Cleared When Adding Wallet Value**
**Root Cause:** The `UpdateModelProperties` method was overwriting existing properties with `null` values when the AI provided partial updates.

**Original Code:**
```csharp
else if (oldValue != newValue)
{
    prop.SetValue(oldModel, newValue);
    // This would set properties to null if newValue was null
}
```

**Fix:** Only update properties when the new value is not null:
```csharp
else if (newValue is not null && !Equals(oldValue, newValue))
{
    prop.SetValue(oldModel, newValue);
    editContext!.NotifyFieldChanged(new FieldIdentifier(oldModel, prop.Name));
    foundChange = true;
}
```

### 2. **DotNetObjectReference Disposed Error**
**Root Cause:** The JavaScript was trying to call back to a disposed DotNetObjectReference.

**Fix:** Improved disposal order in `DisposeAsync`:
```csharp
public async ValueTask DisposeAsync()
{
    await disposalCts.CancelAsync();  // Cancel first
    disposalCts.Dispose();
    realtimeConversationManager?.Dispose();  // Dispose manager
    selfReference?.Dispose();  // Then dispose reference
    // ... dispose module
}
```

### 3. **Incorrect Model Description**
**Root Cause:** The AI was being told it was editing "Car to be listed for sale" instead of "User profile".

**Fix:**
```csharp
realtimeConversationManager = new("User profile",
    RealtimeClient, micPipe.Reader.AsStream(), speaker!, UpdateModel, AddMessage);
```

### 4. **Missing Error Handling**
**Root Cause:** Exceptions in `OnMicConnectedAsync` were not being caught and displayed.

**Fix:**
```csharp
catch (Exception ex)
{
    errorMessage = $"Error connecting to AI: {ex.Message}";
    micStatus = MicControl.MicStatus.Disconnected;
    StateHasChanged();
}
```

### 5. **Async Issues in OnAfterRender**
**Root Cause:** `OnAfterRender` should not block with async calls.

**Fix:**
```csharp
protected override void OnAfterRender(bool firstRender)
{
    if (realtimeConversationManager is not null)
    {
        _ = realtimeConversationManager.SetModelData(user);  // Fire and forget
    }
}
```

## How the Fix Works

1. **Null-Safe Updates**: The AI now provides incremental updates without clearing existing values
2. **Proper Disposal**: Resources are disposed in the correct order, preventing JavaScript callback errors
3. **Correct Context**: The AI understands it's working with user data, not car data
4. **Better Error Messages**: Users see helpful error messages when something goes wrong
5. **Non-Blocking UI**: Async operations don't block the UI thread

## Testing

After these changes:
1. ? First name and last name are retained when adding wallet value
2. ? No DotNetObjectReference disposal errors
3. ? AI understands it's working with user profiles
4. ? Error messages are displayed to users
5. ? UI remains responsive during voice input

## Key Difference from Home.razor

The Home.razor page works because:
- It uses `CarDescriptor` which was the original model
- The AI instructions were written for car data
- The property update logic was tested with car properties

The AddUser.razor needed these specific fixes to work with `UserDescriptor` properly.
