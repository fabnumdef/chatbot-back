import { Roles } from '@core/decorators/roles.decorator';
import { Controller, Post } from '@nestjs/common'
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { UserRole } from '@core/enums/user-role.enum';
import AdminService from './admin.service';

@Controller('admin')
export default class AdminController {

    constructor(private readonly adminService: AdminService) {}

    @Post('reset-data')
    @ApiOperation({ summary: 'Réinitialise les données.' })
    @ApiBearerAuth()
    @Roles(UserRole.admin)
    async resetData() {
        this.adminService.resetData();            
    }

}
