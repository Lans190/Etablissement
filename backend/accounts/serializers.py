from rest_framework import serializers
from django.contrib.auth import get_user_model

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    school_name = serializers.ReadOnlyField(source='school.name')
    school_logo = serializers.SerializerMethodField()
    school_address = serializers.ReadOnlyField(source='school.address')
    school_phone = serializers.ReadOnlyField(source='school.phone_number')
    school_email = serializers.ReadOnlyField(source='school.email')
    # Explicitly restrict children to ELEVE role only — prevents corrupt data from causing 400 errors
    children = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role='ELEVE'),
        many=True,
        required=False
    )

    class Meta:
        model = User
        fields = [
            'id', 'username', 'password', 'first_name', 'last_name', 'email', 'role', 
            'phone_number', 'address', 'matricule', 'cni_number', 'cni_scan', 'school', 
            'school_name', 'school_logo', 'school_address', 'school_phone', 'school_email', 
            'hourly_rate', 'base_salary', 'children'
        ]
        extra_kwargs = {
            'password': {'write_only': True, 'required': False}
        }

    def get_school_logo(self, obj):
        if obj.school and obj.school.logo:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.school.logo.url)
            return obj.school.logo.url
        return None


    def create(self, validated_data):
        children_data = validated_data.pop('children', [])
        user = User.objects.create_user(**validated_data)
        if children_data:
            user.children.set(children_data)
        return user

    def update(self, instance, validated_data):
        children_data = validated_data.pop('children', None)
        if 'password' in validated_data:
            instance.set_password(validated_data.pop('password'))
        
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        if children_data is not None:
            instance.children.set(children_data)
            
        return instance
