# **`@ts-runtime/serialize`**

A robust, clean, and type-driven serialization/deserialization library for TypeScript classes. This package allows you to define how your classes should be serialized to plain JavaScript objects (and back) using decorators, handling nested objects, dates, and even circular references.

## **🌟 Why `@ts-runtime/serialize`?**

While TypeScript provides excellent compile-time type checking, this type information is erased at runtime. This library bridges that gap for serialization, allowing you to:

* **Define Serialization via Decorators:** Annotate your classes and properties with simple decorators to control the serialization process.  
* **Handle Complex Types:** Seamlessly serialize and deserialize `Date` objects and nested instances of other serializable classes.  
* **Manage Circular References:** Automatically detect and correctly re-link circular references during deserialization.  
* **Custom Logic:** Plug in custom serialization/deserialization logic for specific properties.  
* **Type Safety:** Leverage TypeScript's power throughout the serialization pipeline, reducing runtime errors.

This approach offers a cleaner, more maintainable alternative to manually mapping objects or relying on less type-safe `JSON.stringify`/`JSON.parse` for complex data models.

## **🚀 Installation**

npm install @ts-runtime/serialize reflect-metadata  
\# Or using yarn:  
\# yarn add @ts-runtime/serialize reflect-metadata

**Important:** You need to enable `experimentalDecorators` and `emitDecoratorMetadata` in your `tsconfig.json`:

{  
  "compilerOptions": {  
    "experimentalDecorators": true,  
    "emitDecoratorMetadata": true,  
    // ... other options  
  }  
}

And ensure `reflect-metadata` is imported once, typically at the top of your entry file (e.g., `src/index.ts` or `main.ts`):

import 'reflect-metadata';  
// ... rest of your application code

## **📚 Usage**

### **1\. Define Your Serializable Classes**

Decorate your classes with `@Serializable()` and their properties with `@SerializeProperty()`, `@Type()`, or `@CustomSerializer()`.

import 'reflect-metadata'; // Ensure this is at the very top of your application entry point  
import {  
  Serializable,  
  SerializeProperty,  
  Type,  
  CustomTransformer,  
  serialize,  
  deserialize,  
  SerializationError,  
  CircularReferenceError  
} from '@ts-runtime/serialize';

// \--- Custom Transformer Example \---  
interface Point {  
  x: number;  
  y: number;  
}

const PointTransformer: CustomTransformer\<Point, string\> \= {  
  serialize: (point: Point) \=\> \`${point.x},${point.y}\`,  
  deserialize: (str: string) \=\> {  
    const \[x, y\] \= str.split(',').map(Number);  
    if (isNaN(x) || isNaN(y)) {  
      throw new Error('Invalid point string format');  
    }  
    return { x, y };  
  },  
};

// \--- Define Your Classes \---

@Serializable()  
class Address {  
  @SerializeProperty()  
  street: string;

  @SerializeProperty({ name: 'zipCode' }) // Custom serialized name  
  postCode: string;

  @SerializeProperty()  
  city: string;

  constructor(street: string, postCode: string, city: string) {  
    this.street \= street;  
    this.postCode \= postCode;  
    this.city \= city;  
  }  
}

@Serializable()  
class Product {  
  @SerializeProperty()  
  id: string;

  @SerializeProperty()  
  name: string;

  @SerializeProperty()  
  price: number;

  @SerializeProperty({ exclude: true }) // Exclude from serialization  
  internalCost?: number;

  constructor(id: string, name: string, price: number, internalCost?: number) {  
    this.id \= id;  
    this.name \= name;  
    this.price \= price;  
    this.internalCost \= internalCost;  
  }  
}

@Serializable()  
class User {  
  @SerializeProperty()  
  id: string;

  @SerializeProperty()  
  firstName: string;

  @SerializeProperty()  
  lastName: string;

  @SerializeProperty()  
  email: string;

  @SerializeProperty()  
  @Type(() \=\> Address) // Specify nested object type  
  address: Address;

  @SerializeProperty()  
  @Type(() \=\> Product) // Specify array of nested objects  
  purchasedProducts: Product\[\];

  @SerializeProperty()  
  registrationDate: Date; // Date objects are automatically handled (ISO string)

  @SerializeProperty()  
  lastLogin?: Date; // Optional Date

  @SerializeProperty()  
  @CustomSerializer(PointTransformer) // Use custom transformer  
  lastKnownLocation: Point;

  // Circular reference example  
  @SerializeProperty()  
  @Type(() \=\> User)  
  referredBy?: User;

  constructor(  
    id: string,  
    firstName: string,  
    lastName: string,  
    email: string,  
    address: Address,  
    purchasedProducts: Product\[\],  
    registrationDate: Date,  
    lastKnownLocation: Point  
  ) {  
    this.id \= id;  
    this.firstName \= firstName;  
    this.lastName \= lastName;  
    this.email \= email;  
    this.address \= address;  
    this.purchasedProducts \= purchasedProducts;  
    this.registrationDate \= registrationDate;  
    this.lastKnownLocation \= lastKnownLocation;  
  }

  getFullName(): string {  
    return \`${this.firstName} ${this.lastName}\`;  
  }  
}

// \--- Create Instances \---  
const userAddress \= new Address('123 Main St', '90210', 'Beverly Hills');  
const product1 \= new Product('P001', 'Laptop', 1200, 800);  
const product2 \= new Product('P002', 'Mouse', 25, 15);

const user1 \= new User(  
  'U001',  
  'John',  
  'Doe',  
  'john.doe@example.com',  
  userAddress,  
  \[product1, product2\],  
  new Date('2023-01-15T10:00:00Z'),  
  { x: 34.0522, y: \-118.2437 }  
);  
user1.lastLogin \= new Date();

const user2 \= new User(  
  'U002',  
  'Jane',  
  'Smith',  
  'jane.smith@example.com',  
  new Address('456 Oak Ave', '10001', 'New York'),  
  \[\],  
  new Date('2024-03-20T14:30:00Z'),  
  { x: 40.7128, y: \-74.0060 }  
);

// Create a circular reference  
user1.referredBy \= user2;  
user2.referredBy \= user1; // Circular\!

// \--- Serialization \---  
try {  
  console.log('--- Serializing User 1 \---');  
  const serializedUser \= serialize(user1);  
  console.log(JSON.stringify(serializedUser, null, 2));

  // \--- Deserialization \---  
  console.log('\\n--- Deserializing User 1 \---');  
  const deserializedUser \= deserialize(serializedUser, User);  
  console.log(deserializedUser.getFullName());  
  console.log('Registration Date:', deserializedUser.registrationDate);  
  console.log('Last Login Date:', deserializedUser.lastLogin);  
  console.log('Address City:', deserializedUser.address.city);  
  console.log('First Product Name:', deserializedUser.purchasedProducts\[0\].name);  
  console.log('Product 1 Internal Cost (should be undefined):', deserializedUser.purchasedProducts\[0\].internalCost);  
  console.log('Last Known Location:', deserializedUser.lastKnownLocation);

  // Verify circular reference  
  if (deserializedUser.referredBy) {  
    console.log('Referred By User ID:', deserializedUser.referredBy.id);  
    if (deserializedUser.referredBy.referredBy) {  
      console.log('Referred By User\\'s Referred By ID (should be U001):', deserializedUser.referredBy.referredBy.id);  
      console.log('Circular reference re-linked:', deserializedUser.referredBy.referredBy \=== deserializedUser);  
    }  
  }

  // Example: Deserializing only part of the data (missing optional properties)  
  const partialUserData \= {  
    id: 'U003',  
    firstName: 'Alice',  
    lastName: 'Wonder',  
    email: 'alice@example.com',  
    address: { street: 'Rabbit Hole', zipCode: '00000', city: 'Wonderland' },  
    purchasedProducts: \[\],  
    registrationDate: '2022-05-01T00:00:00Z',  
    lastKnownLocation: '10,20'  
    // lastLogin is missing  
  };  
  const deserializedPartialUser \= deserialize(partialUserData, User);  
  console.log('\\n--- Deserialized Partial User \---');  
  console.log('Last Login (should be undefined):', deserializedPartialUser.lastLogin);

} catch (error) {  
  if (error instanceof CircularReferenceError) {  
    console.error('Circular Reference Error:', error.message);  
    console.error('Path:', error.path);  
  } else if (error instanceof SerializationError) {  
    console.error('Serialization Error:', error.message);  
  } else {  
    console.error('An unexpected error occurred:', error);  
  }  
}

### **2\. Serialization Options**

You can pass options to the `serialize` function:

// Include undefined properties in the output  
const serializedUserWithUndefined \= serialize(user1, { includeUndefined: true });

// Throw an error if a circular reference is found  
try {  
  const serializedUserStrict \= serialize(user1, { throwOnCircular: true });  
} catch (error) {  
  if (error instanceof CircularReferenceError) {  
    console.error('Caught expected circular reference error\!');  
  }  
}

### **3\. Error Handling**

The library throws specific error types:

* `SerializationError`: Base class for all serialization/deserialization errors.  
* `CircularReferenceError`: Thrown when a circular reference is detected during serialization and `throwOnCircular` is `true`.  
* `DeserializationError`: Thrown if deserialization fails due to invalid data or missing types.  
* `InvalidTypeError`: Thrown if an unexpected type is encountered.

Always wrap your `serialize` and `deserialize` calls in `try...catch` blocks.

## **🛠️ Development**

### **Project Structure**

ts-runtime/serialize/  
├── src/  
│   ├── index.ts                     // Main entry point  
│   ├── decorators.ts                // Custom decorators (@Serializable, @SerializeProperty, etc.)  
│   ├── serializer.ts                // Core serialization logic  
│   ├── deserializer.ts              // Core deserialization logic  
│   ├── types.ts                     // Interfaces for metadata, options, errors  
│   ├── utils.ts                     // Helper functions (e.g., isPrimitive, getMetadata)  
│   └── errors.ts                    // Custom error classes  
├── tests/                           // Unit tests  
├── package.json  
├── tsconfig.json  
├── README.md  
├── LICENSE

### **Building the Package**

npm run build

This will compile the TypeScript source files into the `dist` directory.

### **Running Tests**

npm test

## **🤝 Contributing**

Contributions are welcome\! If you'd like to contribute, please follow these steps:

1. Fork the repository.  
2. Clone your forked repository: `git clone git+https://github.com/rajasekar-arch/ts-runtime-serialize.git`  
3. Install dependencies: `npm install`  
4. Build the project: `npm run build`  
5. Run tests: `npm test`  
6. Create a new branch for your feature or bug fix.  
7. Make your changes, ensuring they adhere to the coding standards and include tests.  
8. Commit your changes and push to your fork.  
9. Open a pull request to the main repository.

## **📄 License**

This project is licensed under the MIT License \- see the [LICENSE](https://www.google.com/search?q=LICENSE) file for details.

