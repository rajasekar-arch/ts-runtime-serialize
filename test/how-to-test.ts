// --- 1. Ensure 'reflect-metadata' is imported at the very top of your application's entry file ---
// This is crucial for decorators to work correctly.
import 'reflect-metadata';

// --- 2. Import necessary components from the package ---
import {
    Serializable,
    SerializeProperty,
    Type,
    CustomTransformer,
    serialize,
    deserialize,
    SerializationError,
    CustomSerializer,
    CircularReferenceError
} from '@ts-runtime/serialize';

// --- 3. Define a Custom Transformer (Optional) ---
// This example transforms a Point object {x, y} to a string "x,y" and back.
interface Point {
    x: number;
    y: number;
}

const PointTransformer: CustomTransformer<Point, string> = {
    serialize: (point: Point) => {
        if (point === null || point === undefined) return point;
        return `${point.x},${point.y}`;
    },
    deserialize: (str: string) => {
        if (str === null || str === undefined) return str as any; // Handle null/undefined input
        const [x, y] = str.split(',').map(Number);
        if (isNaN(x) || isNaN(y)) {
            throw new Error(`Invalid point string format: "${str}"`);
        }
        return { x, y };
    },
};

// --- 4. Define Your Serializable Classes using Decorators ---

@Serializable()
class Address {
    @SerializeProperty()
    street: string;

    @SerializeProperty({ name: 'zipCode' }) // 'postCode' will be serialized as 'zipCode'
    postCode: string;

    @SerializeProperty()
    city: string;

    constructor(street: string, postCode: string, city: string) {
        this.street = street;
        this.postCode = postCode;
        this.city = city;
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

    @SerializeProperty({ exclude: true }) // This property will NOT be serialized or deserialized
    internalCost?: number;

    constructor(id: string, name: string, price: number, internalCost?: number) {
        this.id = id;
        this.name = name;
        this.price = price;
        this.internalCost = internalCost;
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
    @Type(() => Address) // Use @Type to specify the constructor for nested objects
    address: Address;

    @SerializeProperty()
    @Type(() => Product) // Use @Type for arrays of nested objects too
    purchasedProducts: Product[];

    @SerializeProperty()
    registrationDate: Date; // Date objects are automatically serialized to ISO strings and deserialized back

    @SerializeProperty()
    lastLogin?: Date; // Optional Date property

    @SerializeProperty()
    @CustomSerializer(PointTransformer) // Apply the custom transformer
    lastKnownLocation: Point;

    // Circular reference example: A user can refer another user, and vice-versa
    @SerializeProperty()
    @Type(() => User)
    referredBy?: User;

    constructor(
        id: string,
        firstName: string,
        lastName: string,
        email: string,
        address: Address,
        purchasedProducts: Product[],
        registrationDate: Date,
        lastKnownLocation: Point
    ) {
        this.id = id;
        this.firstName = firstName;
        this.lastName = lastName;
        this.email = email;
        this.address = address;
        this.purchasedProducts = purchasedProducts;
        this.registrationDate = registrationDate;
        this.lastKnownLocation = lastKnownLocation;
    }

    getFullName(): string {
        return `${this.firstName} ${this.lastName}`;
    }
}

// --- 5. Create Instances of Your Classes ---
const userAddress = new Address('123 Main St', '90210', 'Beverly Hills');
const product1 = new Product('P001', 'Laptop', 1200, 800);
const product2 = new Product('P002', 'Mouse', 25, 15);

const user1 = new User(
    'U001',
    'John',
    'Doe',
    'john.doe@example.com',
    userAddress,
    [product1, product2],
    new Date('2023-01-15T10:00:00Z'),
    { x: 34.0522, y: -118.2437 }
);
user1.lastLogin = new Date(); // Set an optional property

const user2 = new User(
    'U002',
    'Jane',
    'Smith',
    'jane.smith@example.com',
    new Address('456 Oak Ave', '10001', 'New York'),
    [],
    new Date('2024-03-20T14:30:00Z'),
    { x: 40.7128, y: -74.0060 }
);

// Create a circular reference between user1 and user2
user1.referredBy = user2;
user2.referredBy = user1; // This creates the circular dependency!

// --- 6. Serialize Your Class Instance ---
try {
    console.log('--- Serializing User 1 ---');
    const serializedUser = serialize(user1);

    // The output is a plain JavaScript object, ready for JSON.stringify or storage
    console.log(JSON.stringify(serializedUser, null, 2));

    // --- 7. Deserialize the Plain Object back into a Class Instance ---
    console.log('\n--- Deserializing User 1 ---');
    const deserializedUser = deserialize(serializedUser, User);

    // Verify that methods and properties are correctly restored
    console.log('Full Name:', deserializedUser.getFullName());
    console.log('Registration Date (Date object):', deserializedUser.registrationDate);
    console.log('Last Login Date (Date object):', deserializedUser.lastLogin);
    console.log('Address City:', deserializedUser.address.city);
    console.log('First Product Name:', deserializedUser.purchasedProducts[0].name);
    // Verify excluded property is undefined after deserialization
    console.log('Product 1 Internal Cost (should be undefined):', deserializedUser.purchasedProducts[0].internalCost);
    // Verify custom transformer worked
    console.log('Last Known Location (Point object):', deserializedUser.lastKnownLocation);

    // Verify circular reference re-linking
    if (deserializedUser.referredBy) {
        console.log('Referred By User ID:', deserializedUser.referredBy.id);
        if (deserializedUser.referredBy.referredBy) {
            console.log('Referred By User\'s Referred By ID (should be U001):', deserializedUser.referredBy.referredBy.id);
            // This assertion confirms the circular reference was correctly re-linked
            console.log('Circular reference re-linked successfully:', deserializedUser.referredBy.referredBy === deserializedUser);
        }
    }

    // --- Example: Deserializing partial data (missing optional properties) ---
    const partialUserData = {
        id: 'U003',
        firstName: 'Alice',
        lastName: 'Wonder',
        email: 'alice@example.com',
        address: { street: 'Rabbit Hole', zipCode: '00000', city: 'Wonderland' }, // Note: zipCode is from 'name' option
        purchasedProducts: [],
        registrationDate: '2022-05-01T00:00:00Z',
        lastKnownLocation: '10,20'
        // 'lastLogin' property is intentionally missing here
    };
    const deserializedPartialUser = deserialize(partialUserData, User);
    console.log('\n--- Deserialized Partial User (missing optional property) ---');
    console.log('Last Login (should be undefined):', deserializedPartialUser.lastLogin);
    console.log('Address Post Code (deserialized from zipCode):', deserializedPartialUser.address.postCode);

    // --- Example: Serialization with options ---
    console.log('\n--- Serializing User 1, including undefined properties ---');
    const userWithUndefinedProp = new User(
        'U004', 'Bob', 'Builder', 'bob@example.com',
        new Address('Construction Site', '00000', 'Workville'),
        [], new Date(), { x: 0, y: 0 }
    );
    // userWithUndefinedProp.lastLogin is undefined
    const serializedWithUndefined = serialize(userWithUndefinedProp, { includeUndefined: true });
    console.log('Serialized with undefined:', JSON.stringify(serializedWithUndefined, null, 2));


    console.log('\n--- Attempting to serialize with throwOnCircular: true ---');
    try {
        serialize(user1, { throwOnCircular: true }); // This will throw because of the circular reference
    } catch (error) {
        if (error instanceof CircularReferenceError) {
            console.error('Successfully caught expected Circular Reference Error!');
            console.error('Error message:', error.message);
            console.error('Path where circularity was detected:', error.path);
        } else {
            console.error('Caught an unexpected error:', error);
        }
    }


} catch (error) {
    // --- 8. Basic Error Handling ---
    if (error instanceof CircularReferenceError) {
        console.error('\nCaught Circular Reference Error at top level:', error.message);
        console.error('Path:', error.path);
    } else if (error instanceof SerializationError) {
        console.error('\nCaught Serialization Error at top level:', error.message);
    } else {
        console.error('\nCaught an unexpected error at top level:', error);
    }
}
