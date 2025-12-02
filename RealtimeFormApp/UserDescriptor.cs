using System.ComponentModel.DataAnnotations;
using System.Text.Json.Serialization;

namespace RealtimeFormApp;
public class UserDescriptor
{
    [Required]
    public string? FirstName { get; set; }
    [Required]
    public string? LastName { get; set; }
    [Required, Range(0, 200000)]
    public int? Wallet { get; set; }
    [Required, EmailAddress]
    public string? Email { get; set; }
    [Required]
    public List<string> Interests { get; set; } = [];

    [ValidateComplexType]
    public InterestStatuses InterestStatus { get; set; } = new();
}

[JsonConverter(typeof(JsonStringEnumConverter))]
public enum InterestCategories { Art, Studio, House, Sport, PlayGround, Urban }

public class InterestStatuses
{
    [Required]
    public InterestCategories? FirstRateCategory { get; set; }
    [Required]
    public InterestCategories? SecondRateCategory { get; set; }
    [Required]
    public InterestCategories? ThirdRateCategory { get; set; }
    [Required]
    public InterestCategories? FourthRateCategory { get; set; }
}