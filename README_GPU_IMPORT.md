# GPU Import from Amazon Product Advertising API

This system imports GPU data from Amazon's Product Advertising API, organized by chipset for better data structure and management.

## Setup

### 1. API Credentials
You'll need Amazon Product Advertising API credentials:
- Access Key ID
- Secret Access Key  
- Associate Tag (from Amazon Associates program)

Add these to your `.env` file:
```env
AMAZON_ACCESS_KEY_ID=your_access_key_here
AMAZON_SECRET_ACCESS_KEY=your_secret_key_here
AMAZON_ASSOCIATE_TAG=your_associate_tag_here
AMAZON_REGION=us-east-1
AMAZON_HOST=webservices.amazon.com
```

### 2. Prerequisites
- Amazon Associates account
- Product Advertising API access approved
- MongoDB running locally

## Chipset Organization

The system organizes GPUs into the following chipsets:

### NVIDIA RTX 40 Series
- **RTX 4090**: Flagship Ada Lovelace, 24GB GDDR6X
- **RTX 4080**: High-end Ada Lovelace, 16GB GDDR6X  
- **RTX 4070 Ti**: Performance Ada Lovelace, 12GB GDDR6X
- **RTX 4070**: Mainstream Ada Lovelace, 12GB GDDR6X

### NVIDIA RTX 30 Series
- **RTX 3080 Ti**: High-end Ampere, 12GB GDDR6X
- **RTX 3080**: Performance Ampere, 10GB GDDR6X

### AMD RX 7000 Series
- **RX 7900 XTX**: Flagship RDNA 3, 24GB GDDR6
- **RX 7900 XT**: High-end RDNA 3, 20GB GDDR6

## Usage

### Run Import
```bash
# Using the runner script (recommended)
npm run import-gpus

# Or directly
npm run import-gpus-direct
```

### Data Structure
Each GPU includes:
- **Basic Info**: Name, manufacturer, partner brand
- **Chipset Classification**: Organized by GPU chipset
- **Technical Specs**: Memory, core clocks, power requirements
- **Amazon Data**: Price, images, features
- **Compatibility**: Motherboard, PSU, case requirements

### Database Organization
GPUs are stored in MongoDB with a `chipsetGroup` field for easy filtering:

```javascript
// Find all RTX 4090 GPUs
db.gpus.find({ chipsetGroup: "RTX 4090" })

// Find all NVIDIA GPUs
db.gpus.find({ manufacturer: "NVIDIA" })

// Find GPUs by partner brand
db.gpus.find({ partner: "ASUS" })
```

## Features

### Chipset-Based Processing
- Searches Amazon for each chipset separately
- Applies chipset-specific specifications
- Organizes results by GPU architecture

### Data Enrichment
- Extracts partner brands (ASUS, MSI, EVGA, etc.)
- Adds technical specifications based on chipset
- Includes performance scores and compatibility info

### Rate Limiting
- Includes 1-second delays between API calls
- Handles Amazon API rate limits gracefully
- Provides detailed error messages

### Error Handling
- Validates API credentials before starting
- Handles individual chipset failures gracefully  
- Continues processing even if some chipsets fail

## API Limits & Considerations

### Amazon API Limits
- 8,640 requests per day for approved accounts
- Rate limiting applies (1 request per second recommended)
- Requires active Amazon Associates account

### Data Quality
- Extracts available data from Amazon listings
- Supplements with technical specifications by chipset
- May require manual cleanup for optimal accuracy

## Troubleshooting

### Common Issues

**API Credentials Invalid**
```
Missing required Amazon API configuration
```
- Check your .env file has all required fields
- Verify credentials are active in Amazon Console

**Rate Limit Exceeded**
```
Amazon API Error: Too Many Requests
```
- Wait 60 minutes before retrying
- Consider reducing chipset scope

**Database Connection**
```
Database not connected
```
- Ensure MongoDB is running
- Check MONGODB_URI in .env file

### Support
For Amazon API issues, consult:
- [Amazon Product Advertising API Documentation](https://webservices.amazon.com/paapi5/documentation/)
- [Amazon Associates Central](https://affiliate-program.amazon.com/)

## Example Output

```
🔌 Starting Amazon GPU import organized by chipset...

🔍 Searching for RTX 4090 GPUs...
✓ Found 8 RTX 4090 GPUs

🔍 Searching for RTX 4080 GPUs...  
✓ Found 6 RTX 4080 GPUs

💾 Inserting 45 GPUs into database...
✓ Successfully inserted 45 GPUs

📊 Import Summary by Chipset:
  RTX 4090: 8 GPUs
  RTX 4080: 6 GPUs
  RTX 4070 Ti: 5 GPUs
  RTX 4070: 7 GPUs
  RTX 3080 Ti: 4 GPUs
  RTX 3080: 6 GPUs
  RX 7900 XTX: 5 GPUs
  RX 7900 XT: 4 GPUs

🎉 GPU import completed successfully!
```