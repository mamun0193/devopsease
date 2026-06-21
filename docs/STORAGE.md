# DevOpsEase Storage Architecture

The storage layer in DevOpsEase abstracts all interactions with runtime assets (like build logs, pipeline logs, workspaces, and artifacts) away from direct filesystem commands. This provider-based architecture ensures the application is natively capable of scaling to cloud object storage providers like Amazon S3 without requiring any application-level logic changes.

---

## 1. Provider-Based Architecture

All application services exclusively communicate with the `StorageService`, which dynamically delegates operations to the configured provider at runtime.

```text
Application Services (Build, Pipeline, etc.)
                   │
                   ▼
             StorageService
                   │
         ┌─────────┴─────────┐
         ▼                   ▼
    LocalStorage         S3Storage
```

### Supported Providers
- **`local`**: Writes files directly to a local hard drive or mounted volume. Ideal for development, single-node deployments, and edge environments.
- **`s3`**: Integrates with AWS S3 (or S3-compatible APIs like MinIO) for highly scalable, distributed production deployments. *(Currently pending AWS SDK implementation).*

---

## 2. Configuration

Storage behavior is governed entirely via Environment Variables.

### Local Storage Configuration
```env
# Define the active provider
STORAGE_DRIVER=local

# Define the root path where all local assets will be stored.
# If omitted, defaults to "DEVOPSEASE_STORAGE" in the project root.
STORAGE_ROOT=D:/DevOpsEaseData
```

### Amazon S3 Configuration (Production)
```env
STORAGE_DRIVER=s3
AWS_REGION=us-east-1
AWS_BUCKET=my-devopsease-bucket
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
```

---

## 3. Database Metadata

To ensure smooth migrations, MongoDB does not store absolute filesystem paths (e.g., `C:/logs/build.log`). Instead, it stores provider-agnostic pointers.

**Mongoose Schema Definition:**
```javascript
storage: {
    driver: { type: String, enum: ['local', 's3'], default: 'local' },
    key: { type: String, default: null }
}
```

**Example MongoDB Document:**
```json
{
    "_id": "60d5ec...",
    "status": "success",
    "storage": {
        "driver": "local",
        "key": "logs/builds/60d5ec.log"
    }
}
```

If you migrate from `local` to `s3` in the future, the application natively knows which driver owns a specific log based on this subdocument.

---

## 4. Developer Usage Guide

Whenever a service needs to interact with files, you **must not** use the Node.js `fs` module. 

### Generating Keys
Never hardcode string paths. Use the centralized `keys.js` registry to guarantee consistent asset directory structures.
```javascript
import { storageService } from '../storage/storage.service.js';

// Get a standardized key (e.g., "logs/builds/123.log")
const key = storageService.keys.buildLog('123');
```

### Common Operations
```javascript
// Writing files
await storageService.write(key, 'Initial content');

// Appending to logs
await storageService.append(key, 'New log line');

// Reading files
const content = await storageService.read(key);

// Streaming files (e.g., to an Express response)
const stream = storageService.createReadStream(key);
stream.pipe(res);

// Deleting files
await storageService.delete(key);
```

### Local Operations (Workspaces)
Certain operations like `docker build` or `git clone` require physical file paths. You can request the resolved absolute path from the service, but note this will throw an error if the application is running in an `s3` configuration without a local cache volume.
```javascript
const localPath = storageService.getAbsolutePath(key);
```

---

## 5. Startup Validation

The storage layer enforces strict **fail-fast** rules. During the Express server boot phase (`index.js`), `await storageService.init()` is executed. 

If the backend determines that the configured `STORAGE_ROOT` is unwritable, or if an unimplemented provider is requested, the application will instantly crash and refuse to boot, ensuring pipelines cannot unexpectedly fail mid-execution due to storage errors.
