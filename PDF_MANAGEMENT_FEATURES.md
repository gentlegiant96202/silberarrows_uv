# 📄 **PDF Management Features for Service Contracts**

## ✅ **Features Implemented:**

### **1. Download PDF**
- **Button**: Blue download button with download icon
- **Function**: Opens existing PDF in new tab/window for viewing/downloading
- **Availability**: Only visible when contract has a PDF attached

### **2. Generate PDF (NEW)**
- **Button**: Green generate button with document icon
- **Function**: Creates PDF from existing contract data and downloads it
- **Workflow**: Contract → Edit Modal → Generate PDF → Download & Save
- **Availability**: Only visible when contract has NO PDF attached
- **Security**: Validates edit permissions before allowing operation

### **3. Delete PDF**
- **Button**: Red delete button with trash icon  
- **Function**: Removes PDF from both storage and database
- **Confirmation**: Requires user confirmation before deletion
- **Security**: Validates delete permissions before allowing operation
- **Cleanup**: Removes file from Supabase storage and clears PDF URL from contract

### **4. Upload New PDF**
- **Replace Existing**: "Upload New PDF" button when PDF exists
- **Upload New**: "Upload PDF" button when no PDF exists (alternative to Generate)
- **File Validation**: 
  - Only accepts PDF files (`.pdf`)
  - Maximum file size: 10MB
  - MIME type validation: `application/pdf`
- **Storage**: Uploads to Supabase `service-documents` bucket
- **Naming**: Auto-generates unique filename: `{type}_contract_{referenceNo}_{timestamp}.pdf`

## 🔄 **New Workflow:**

### **Contract Creation Process**
```
1. User fills out New Contract form
2. Contract saved to database (without PDF)
3. Success message: "Contract created! Generate PDF from edit modal"
4. User can see contract in list
5. User clicks Edit → Opens ContractEditModal
6. User sees "Generate PDF" or "Upload PDF" options
7. User clicks "Generate PDF" → PDF created, downloaded, and saved
```

### **Previous vs New Workflow**
```
❌ OLD: Create Contract → Auto-generate PDF → Download → Save
✅ NEW: Create Contract → Manual PDF Generation → Download & Save
```

## 🔐 **Security Features:**

### **Permission Validation**
- **Create Contract**: Requires `canCreate` permission
- **Generate PDF**: Requires `canEdit` permission (generating is considered editing)
- **Upload**: Requires `canEdit` permission (uploading is considered editing)
- **Delete**: Requires `canDelete` permission  
- **Authorization**: All API calls include Bearer token authentication
- **User Tracking**: Logs which user performed the action

### **Activity Logging**
- **Generate Action**: Records filename, generator, timestamp
- **Upload Action**: Records filename, file size, uploader, timestamp
- **Delete Action**: Records deleted URL, deleter, timestamp
- **Contract Activities**: All PDF operations logged in `contract_activities` table

## 🎨 **UI/UX Features:**

### **Glass Morphism Design**
- Consistent with app's design language
- Black and silver gradients
- Backdrop blur effects
- Professional appearance

### **State Management**
- **Loading States**: Shows "Generating...", "Uploading...", "Deleting..." during operations
- **Disabled States**: Prevents multiple simultaneous operations
- **Error Handling**: User-friendly error messages
- **Success Feedback**: Confirmation alerts for successful operations

### **Responsive Layout**
- **Two Scenarios**:
  1. **PDF Exists**: Shows download/delete buttons + replace option
  2. **No PDF**: Shows generate PDF and upload PDF options side by side
- **File Input**: Hidden file input triggered by custom styled buttons
- **Visual Indicators**: Icons and colors indicate PDF status

## 🔧 **Technical Implementation:**

### **API Endpoints**
- **`POST /api/service-contracts`**: Create new contract (without PDF)
- **`POST /api/service-contracts/[id]/generate-pdf`**: Generate PDF for existing contract
- **`POST /api/service-contracts/[id]/pdf`**: Upload new PDF
- **`DELETE /api/service-contracts/[id]/pdf`**: Delete existing PDF
- **Permission validation on all endpoints**
- **Comprehensive error handling and logging**

### **File Handling**
- **Generate**: Fetches contract data → Calls PDF service → Downloads & stores
- **Upload**: FormData with multipart file upload
- **Storage**: Supabase Storage with public URL generation  
- **Cleanup**: Automatic file cleanup on database update failures
- **Path Parsing**: Robust URL parsing for storage file deletion

### **Database Integration**
- **Contract Creation**: Saves contract without PDF URL initially
- **PDF URL Storage**: Updates `pdf_url` field when PDF is generated/uploaded
- **Activity Logging**: Tracks all PDF-related activities
- **Atomic Operations**: Ensures data consistency

## 📱 **User Experience:**

### **No PDF State (NEW)**
```
┌─────────────────────────────────────────┐
│ 📄 Contract Document                   │
├─────────────────────────────────────────┤
│           ⚠️                           │
│     No PDF Document                    │
│ Generate a new contract PDF or upload  │
│         an existing one                │
│                                        │
│  [📄 Generate PDF]  or  [📤 Upload]   │
└─────────────────────────────────────────┘
```

### **PDF Exists State**
```
┌─────────────────────────────────────────┐
│ 📄 Contract Document                   │
├─────────────────────────────────────────┤
│ [📄] Contract PDF Available            │
│      Current contract document         │
│                                        │
│              [📥 Download] [🗑️ Delete] │
│                                        │
│ Replace with new PDF:                  │
│ [📤 Upload New PDF]                    │
└─────────────────────────────────────────┘
```

## 🔄 **Integration Points:**

### **Modal Integration**
- **Form Section**: PDF management appears at top of edit form
- **State Sync**: Updates contract object in real-time
- **Validation**: Works alongside form validation
- **Permissions**: Respects user's edit/delete permissions

### **Storage Configuration**
- **Bucket**: `service-documents`
- **Access**: Public read access for PDF viewing
- **Organization**: Organized by contract type and reference number

## 🎯 **Usage Examples:**

### **Create Contract (NEW WORKFLOW)**
1. User fills out contract creation form
2. Contract saved to database without PDF
3. Success message displays
4. Contract appears in list (without PDF icon)
5. User can edit contract to generate PDF

### **Generate PDF (NEW)**
1. User opens edit modal for contract without PDF
2. User sees "Generate PDF" and "Upload PDF" options
3. User clicks "Generate PDF"
4. System fetches contract data from database
5. System calls PDF generation service with contract data
6. PDF is generated and automatically downloaded
7. PDF is uploaded to storage and URL saved to contract
8. Activity logged with user details
9. UI updates to show PDF available state

### **Upload Existing PDF**
1. User clicks "Upload PDF" button (alternative to generate)
2. File selector opens (accepts only .pdf files)
3. User selects PDF file
4. System validates file type and size
5. File uploads to Supabase storage
6. Contract record updated with PDF URL
7. Activity logged with user details
8. Success message displayed

### **Replace Existing PDF**
1. User clicks "Upload New PDF" (in replace section)
2. New file selected and uploaded
3. Old PDF remains in storage (not automatically deleted)
4. Contract record updated with new PDF URL
5. Activity logged as PDF replacement

### **Delete PDF**
1. User clicks "Delete" button
2. Confirmation dialog appears
3. User confirms deletion
4. PDF removed from storage
5. Contract record updated (PDF URL set to null)
6. Activity logged as PDF deletion
7. UI updates to show "No PDF" state with generate/upload options

## 📊 **Benefits:**

- ✅ **Flexible Contract Creation** - Create contracts without mandatory PDF generation
- ✅ **On-Demand PDF Generation** - Generate PDFs only when needed
- ✅ **Complete PDF Lifecycle Management**
- ✅ **Secure Permission-Based Access**  
- ✅ **Comprehensive Activity Tracking**
- ✅ **Professional UI/UX**
- ✅ **Error Handling & Validation**
- ✅ **Real-time UI Updates**
- ✅ **Mobile-Friendly Design**
- ✅ **User Choice** - Generate new PDF or upload existing one 