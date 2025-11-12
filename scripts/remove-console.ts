import path from "path";
import { Node, Project, SyntaxKind, type Expression, type Statement } from "ts-morph";

function unwrapExpression(expression: Expression): Expression {
  if (Node.isAwaitExpression(expression) || Node.isParenthesizedExpression(expression)) {
    return unwrapExpression(expression.getExpression());
  }
  return expression;
}

function isConsoleCallExpression(expression: Expression): expression is Expression {
  if (!Node.isCallExpression(expression)) {
    return false;
  }

  const callee = expression.getExpression();

  if (Node.isIdentifier(callee)) {
    return callee.getText() === "console";
  }

  if (Node.isPropertyAccessExpression(callee) || Node.isElementAccessExpression(callee)) {
    return callee.getExpression().getText() === "console";
  }

  if ("getExpression" in callee) {
    try {
      return (callee as { getExpression: () => Expression }).getExpression().getText() === "console";
    } catch {
      return false;
    }
  }

  return false;
}

function handleRemoval(statement: Statement): void {
  const parent = statement.getParent();

  if (
    Node.isIfStatement(parent) ||
    Node.isForStatement(parent) ||
    Node.isForInStatement(parent) ||
    Node.isForOfStatement(parent) ||
    Node.isWhileStatement(parent) ||
    Node.isDoStatement(parent) ||
    Node.isWithStatement(parent)
  ) {
    statement.replaceWithText("{}");
    return;
  }

  statement.remove();
}

async function run(): Promise<void> {
  const scriptPath = path.join(process.cwd(), "scripts/remove-console.ts");
  const project = new Project({
    tsConfigFilePath: path.join(process.cwd(), "tsconfig.json"),
    skipAddingFilesFromTsConfig: false,
  });

  project.addSourceFilesAtPaths([
    "**/*.ts",
    "**/*.tsx",
    "**/*.js",
    "**/*.jsx",
    "!node_modules/**/*",
    "!.next/**/*",
    "!out/**/*",
    "!dist/**/*",
    "!**/*.d.ts",
  ]);

  const sourceFiles = project
    .getSourceFiles()
    .filter((file) => !file.getFilePath().includes("/node_modules/"));

  let totalRemoved = 0;
  const results: Array<{ filePath: string; removed: number }> = [];

  for (const sourceFile of sourceFiles) {
    if (path.normalize(sourceFile.getFilePath()) === path.normalize(scriptPath)) {
      continue;
    }

    const statements = sourceFile.getDescendantsOfKind(SyntaxKind.ExpressionStatement);
    let removedInFile = 0;

    for (const statement of statements) {
      const expression = unwrapExpression(statement.getExpression());
      if (!isConsoleCallExpression(expression)) {
        continue;
      }

      handleRemoval(statement);
      removedInFile += 1;
    }

    if (removedInFile > 0) {
      totalRemoved += removedInFile;
      results.push({
        filePath: path.relative(process.cwd(), sourceFile.getFilePath()),
        removed: removedInFile,
      });
    }
  }

  if (totalRemoved === 0) {
    console.log("No console statements were found.");
    return;
  }

  await project.save();
  console.log(`Removed ${totalRemoved} console statement(s) across ${results.length} file(s).`);
  for (const result of results) {
    console.log(`  • ${result.filePath}: ${result.removed}`);
  }
}

run().catch((error) => {
  console.error("Failed to remove console statements.");
  console.error(error);
  process.exit(1);
});

