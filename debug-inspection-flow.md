# Inspection Check Update Flow Analysis

## Data Flow

### 1. User clicks Pass/Fail button
- InspectionCheckItem component calls `handleCheckToggle(true/false)`
- Line 213-215: `handleCheckToggle` calls `onUpdate({ is_checked: checked, notes, photo })`

### 2. Parent component receives update
- Line 160: `onUpdate={(data) => updateCheckMutation.mutate({ checkId: check.id, ...data })}`
- This triggers the mutation with: `{ checkId: check.id, is_checked: true/false, notes, photo }`

### 3. Mutation executes
- Lines 34-55: `updateCheckMutation` sends PUT request to `/inspections/check/{checkId}`
- Line 41-43: Request goes through `api.put()` with FormData

### 4. API routing
- client/src/services/api.js line 90-92: Routes to `firestoreService.updateInspectionCheck(checkId, data)`

### 5. Firestore update
- client/src/services/firestoreService.js line 451-453: 
  ```js
  async updateInspectionCheck(checkId, data) {
    return this.update('inspection_checks', checkId, data);
  }
  ```
- Line 65-72: Generic update method:
  ```js
  async update(collectionName, id, data) {
    const docRef = doc(db, collectionName, id);
    await updateDoc(docRef, {
      ...data,
      updatedAt: new Date().toISOString()
    });
    return { data: { id, ...data } };  // PROBLEM: Returns partial data!
  }
  ```

### 6. Mutation success callback
- Line 47-49: On success, invalidates query `['inspection', id]`
- This should trigger a refetch of the inspection data

### 7. Query refetch
- Lines 23-32: useQuery for inspection data
- Calls `api.get(/inspections/{id})`
- Routes to `firestoreService.getInspectionWithChecks(inspectionId)`

## IDENTIFIED ISSUES

### Issue 1: Stale Closure in InspectionCheckItem
**Location**: `/Volumes/Q/Coding/inspex/client/src/pages/InspectionDetail.js` lines 208-228

The `InspectionCheckItem` component receives the `check` prop but uses stale values from closure:

```js
function InspectionCheckItem({ check, index, onUpdate, isUpdating, readOnly }) {
  const [notes, setNotes] = useState(check.notes || '');
  const [photo, setPhoto] = useState(null);
  const [showNotes, setShowNotes] = useState(!!check.notes);

  const handleCheckToggle = (checked) => {
    onUpdate({ is_checked: checked, notes, photo });  // Uses stale 'notes' and 'photo'
  };
```

**Problem**: When user clicks Pass/Fail, it sends `is_checked` with the current local state of `notes` and `photo`, but `check.is_checked` from props is stale. The component doesn't re-render with new check data because:

1. The check object itself changes in the parent
2. But the child component's conditional styling (lines 231-235) uses `check.is_checked` from props
3. When mutation succeeds and query invalidates, new data arrives
4. However, the component may not re-render if React thinks the props haven't changed

### Issue 2: React Query Stale Time
**Location**: `/Volumes/Q/Coding/inspex/client/src/index.js` line 12

```js
staleTime: 5 * 60 * 1000, // 5 minutes
```

**Problem**: With a 5-minute stale time, after invalidation, React Query might not immediately refetch if it considers the data still fresh.

### Issue 3: Mutation Response Doesn't Return Updated Check
**Location**: `/Volumes/Q/Coding/inspex/client/src/services/firestoreService.js` line 72

```js
return { data: { id, ...data } };
```

**Problem**: The update mutation returns only the fields that were updated, not the complete updated document. This means the response doesn't include the full check object with all fields.

### Issue 4: No Optimistic Update
The mutation doesn't use optimistic updates, so the UI won't change until:
1. Mutation completes
2. Query invalidates
3. Query refetches
4. New data arrives
5. Component re-renders

## ROOT CAUSE

The primary issue is **stale closure combined with React Query caching**:

1. User clicks Pass - mutation fires with `is_checked: true`
2. Mutation succeeds and invalidates the query
3. Query refetch is triggered
4. New data arrives with `is_checked: true` 
5. BUT the `InspectionCheckItem` component doesn't properly re-render because:
   - React may think the `check` prop hasn't changed (object reference might be the same)
   - The stale time prevents immediate refetch
   - There's no key or dependency that forces re-render

## RECOMMENDED SOLUTIONS

### Solution 1: Add Optimistic Update (Best UX)
Update the mutation to optimistically update the UI immediately:

```js
const updateCheckMutation = useMutation(
  async ({ checkId, is_checked, notes, photo }) => {
    // ... mutation logic
  },
  {
    onMutate: async ({ checkId, is_checked }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries(['inspection', id]);
      
      // Snapshot previous value
      const previousData = queryClient.getQueryData(['inspection', id]);
      
      // Optimistically update
      queryClient.setQueryData(['inspection', id], (old) => {
        if (!old) return old;
        return {
          ...old,
          checks: old.checks.map(c => 
            c.id === checkId ? { ...c, is_checked } : c
          )
        };
      });
      
      return { previousData };
    },
    onError: (err, variables, context) => {
      // Rollback on error
      if (context?.previousData) {
        queryClient.setQueryData(['inspection', id], context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries(['inspection', id]);
    }
  }
);
```

### Solution 2: Force Immediate Refetch
Change the invalidation to force immediate refetch:

```js
onSuccess: () => {
  queryClient.invalidateQueries(['inspection', id], { 
    refetchType: 'active',
    exact: true 
  });
  // OR force refetch:
  queryClient.refetchQueries(['inspection', id]);
}
```

### Solution 3: Add Key to InspectionCheckItem
Force component to re-mount when check data changes:

```js
<InspectionCheckItem
  key={`${check.id}-${check.is_checked}`}  // Force re-render when is_checked changes
  check={check}
  // ... other props
/>
```

### Solution 4: Use useEffect to Sync Props to State
In InspectionCheckItem, sync the check prop changes:

```js
useEffect(() => {
  setNotes(check.notes || '');
  setShowNotes(!!check.notes);
}, [check.notes, check.is_checked]);  // Re-sync when check changes
```

## RECOMMENDED FIX

Implement Solution 1 (Optimistic Update) combined with Solution 4 (useEffect sync):

1. Add optimistic update to immediately reflect UI changes
2. Add useEffect to sync prop changes to local state
3. Consider reducing staleTime or using refetchQueries instead of invalidateQueries

This provides the best user experience with immediate feedback while maintaining data consistency.
