import { IsNotEmpty, IsString, Length } from 'class-validator';

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  @Length(1, 100)
  login!: string;

  @IsString()
  @IsNotEmpty()
  @Length(1, 200)
  password!: string;
}
