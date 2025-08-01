import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class UserRoles1753434528479 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn("users", new TableColumn({
            name: "roles",
            type: "text",
            isArray: true,
            default: "'{user}'"
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("users", "roles");
    }

}
