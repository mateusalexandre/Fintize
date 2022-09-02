import express, { Express, Request, Response, NextFunction } from "express";
import { v4 } from "uuid";
const app = express();

app.use(express.json());

interface Customer {
  cpf?: string;
  id: any;
  name?: string;
  statement?: []
}

interface Statement {
  type: string, 
  amount: number,
  created_at: any
}

const customers: Customer[] = [];

function verifyIfExistsAccountCPF(request: Request, response: Response, next: NextFunction) {
  const { cpf } = request.headers;
  const customer = customers.find((customer) => customer.cpf === cpf) as Customer;

  if (!customer) {
    return response.status(400).json({ error: "Customer not found" });
  }

  request.customer = customer;

  return next();
}

function getBalance(statement: Statement[]) {
  const balance = statement.reduce((acc, operation) => {
    if (operation.type === "credit") {
      return acc + operation.amount;
    }

    return acc - operation.amount;
  }, 0);

  return balance;
}

app.post("/account", (request: Request, response: Response) => {
  const { cpf, name } = request.body;
  const customerAlreadyExists = customers.some(
    (customer) => customer.cpf === cpf
  );

  if (customerAlreadyExists) {
    return response.status(400).json({ error: "Customer already exists" });
  }

  customers.push({
    cpf,
    name,
    id: v4(),
    statement: [],
  });

  return response.status(201).send();
});

app.post("/deposit", verifyIfExistsAccountCPF, (request: Request, response: Response) => {
  const { description, amount } = request.body;
  const { customer } = request;
  const statementOperation = {
    description,
    amount,
    created_at: new Date(),
    type: "credit",
  };

  customer.statement.push(statementOperation);

  return response.status(201).send();
});

app.post("/withdraw", verifyIfExistsAccountCPF, (request: Request, response: Response) => {
  const { amount } = request.body;
  const { customer } = request;
  const balance = getBalance(customer.statement);

  if (balance < amount) {
    return response.status(400).json({ error: "Insufficient funds!" });
  }

  const statementOperation = {
    amount,
    created_at: new Date(),
    type: "debit",
  };

  customer.statement.push(statementOperation);
  return response.status(201).send();
});

app.get("/statement", verifyIfExistsAccountCPF, (request: Request , response: Response) => {
  const { customer } = request;

  return response.json(customer.statement);
});

app.get("/statement/date", verifyIfExistsAccountCPF, (request: Request, response: Response) => {
  const { customer } = request;
  const { date } = request.query;
  const dateFormat = new Date(date + " 00:00");
  const statement = customer.statement.filter(
    (statement: Statement) =>
      statement.created_at.toDateString() ===
      new Date(dateFormat).toDateString()
  );

  return response.json(statement);
});

app.put("/account", verifyIfExistsAccountCPF, (request: Request, response: Response) => {
  const { name } = request.body;
  const { customer } = request;

  customer.name = name;

  return response.status(201).send();
});

app.get("/account", verifyIfExistsAccountCPF, (request: Request, response: Response) => {
  const { customer } = request;

  return response.json(customer);
});

app.get("/balance", verifyIfExistsAccountCPF, (request: Request, response: Response) => {
  const { customer } = request;
  const balance = getBalance(customer.statement);

  return response.json(balance);
});

app.delete("/account", verifyIfExistsAccountCPF, (request: Request, response: Response) => {
  const { customer } = request;

  customers.splice(customer, 1);

  return response.status(200).json(customers);
});

app.listen("3001");
